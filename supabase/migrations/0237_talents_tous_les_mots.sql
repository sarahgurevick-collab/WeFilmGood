-- 05/11/2026, Sarah : la recherche des talents refaite sur une seule règle.
-- Chaque mot de la recherche doit se trouver chez le talent, sans
-- approximation : dans son métier, dans ses langues parlées, dans son nom,
-- sa ville ou sa biographie, ou dans un mot-clé tiré de sa biographie.
-- Les petits mots (« qui », « parle », « déjà », « travaillé »…) ne
-- comptent pas. Singulier = pluriel et masculin = féminin (0235).
--
-- Exemples : « scénariste qui parle espagnol » = scénariste ET espagnol ;
-- « chef opérateur qui a déjà travaillé au Qatar » = le métier chef
-- opérateur (un seul critère, même en deux mots) ET Qatar.
--
-- Avant : le métier seul suffisait (710 scénaristes pour « scénariste qui
-- parle espagnol »), les auteurs des projets trouvés comptaient aussi, et
-- la recherche dépassait souvent les 8 secondes permises.

create or replace function public.rechercher_talents(q text, p_limite integer default 60)
returns table(id uuid, score real, total bigint, metiers text[])
language sql stable security definer
set search_path to 'public', 'extensions'
as $$
  with
  -- La recherche en minuscules sans accent, ses mots séparés par des espaces.
  texte as materialized (
    select ' ' || btrim(regexp_replace(lower(public.sans_accent(coalesce(q, ''))), '[^a-z0-9]+', ' ', 'g')) || ' ' as t
  ),
  mots as materialized (
    select w from public.mots_de_recherche(q) w
    where w not in ('deja', 'travaille', 'travailler', 'travaillant', 'travaillee', 'ayant', 'avoir',
                    'ete', 'etre', 'experience', 'experimente', 'experimentee', 'parlant', 'parlent',
                    'connaissance', 'connaissances', 'maitrise', 'maitrisant', 'pratique', 'notamment')
  ),
  -- Les métiers nommés dans la recherche, par leur nom ou un autre nom
  -- (« chef opérateur », « actrice »), au féminin ou au pluriel aussi.
  noms_metiers as (
    select r.slug, btrim(regexp_replace(lower(public.sans_accent(n)), '[^a-z0-9]+', ' ', 'g')) as nom
    from public.roles r
    cross join lateral unnest(array[r.label_fr] || r.synonymes) n
    where r.slug <> 'lecteur'
  ),
  metiers_q as materialized (
    select distinct nm.slug, nm.nom
    from noms_metiers nm, texte
    where nm.nom <> ''
      and (texte.t like '% ' || nm.nom || ' %'
           or (position(' ' in nm.nom) = 0
               and exists (select 1 from mots m where nm.nom = any(public.formes_du_mot(m.w)))))
  ),
  -- Les mots qui restent une fois les métiers retirés : chacun est un critère.
  restants as materialized (
    select m.w, '%' || m.w || '%' as motif, public.rx_formes(m.w) as rx, public.formes_du_mot(m.w) as formes
    from mots m
    where not exists (
      select 1 from metiers_q mq
      where m.w = any(string_to_array(mq.nom, ' '))
         or mq.nom = any(public.formes_du_mot(m.w))
    )
  ),
  nb as materialized (
    select (select count(distinct slug) from metiers_q) + (select count(*) from restants) as n
  ),
  -- Les talents qui peuvent sortir (mêmes exclusions qu'avant).
  candidats as materialized (
    select p.id, p.full_name, p.avatar_url,
           public.sans_accent(concat_ws(' ', p.full_name, p.display_name, p.city, p.bio, p.biofilmo)) as fiche
    from public.profiles p
    where auth.uid() is not null
      and p.anonymized_at is null
      and p.departed_at is null
      and coalesce(btrim(p.full_name), btrim(p.display_name), '') <> ''
      and not exists (select 1 from public.profile_roles l where l.profile_id = p.id and l.role_slug = 'lecteur')
      and not exists (select 1 from wfg1.accounts a where a.user_id::text = p.legacy_id and a.role = 'reader')
      and coalesce(p.category::text, '') <> 'cinephile'
  ),
  -- Les métiers cochés : celui choisi sur WFG 2, ou ceux de WFG 1 pour qui
  -- ne les a pas encore repris.
  coches_metiers as (
    select distinct pr.profile_id as id, mq.slug as critere
    from metiers_q mq join public.profile_roles pr on pr.role_slug = mq.slug
    union
    select distinct w.profile_id, mq.slug
    from metiers_q mq join public.wfg1_metiers_membres w on w.slug = mq.slug
    where not exists (select 1 from public.profile_roles pr
                      where pr.profile_id = w.profile_id and pr.role_slug <> 'lecteur')
  ),
  -- Les mots cochés : par le texte du profil, une langue parlée, un mot-clé.
  coches_mots as (
    select c.id, r.w as critere
    from candidats c, restants r
    where public.contient(c.fiche, r.motif, r.rx)
    union
    select pl.profile_id, r.w
    from restants r
    join public.languages g
      on (position(' ' in lower(public.sans_accent(g.label_fr))) = 0
          and r.w like lower(public.sans_accent(g.label_fr)) || '%')
         or (g.code = 'lsf' and r.w = 'lsf')
    join public.profile_languages pl on pl.language_code = g.code
    union
    select pk.profile_id, r.w
    from restants r
    join public.keywords k
      on lower(public.sans_accent(k.label_fr)) = r.w
         or lower(public.sans_accent(k.label_fr)) = any(r.formes)
    join public.profile_keywords pk on pk.keyword_id = k.id
  ),
  trouves as (
    select co.id
    from (select * from coches_metiers union select * from coches_mots) co, nb
    where nb.n > 0
    group by co.id
    having count(distinct co.critere) = max(nb.n)
  ),
  -- Sans aucun mot de trois lettres (« Li ») : le nom seul, comme avant.
  par_nom as (
    select c.id from candidats c, texte
    where (select n from nb) = 0 and btrim(texte.t) <> ''
      and c.fiche ilike '%' || btrim(texte.t) || '%'
  ),
  tous as (
    select c.id, c.full_name, c.avatar_url,
           -- Le nom tapé tel quel passe devant.
           (case when lower(public.sans_accent(coalesce(c.full_name, ''))) = btrim(texte.t) then 0.95 else 0.80 end)::real as score
    from candidats c, texte
    where c.id in (select id from trouves union select id from par_nom)
  )
  select x.id, x.score, x.total,
         array(select r.label_fr
               from unnest(public.metiers_du_membre(x.id)) with ordinality m(slug, rang)
               join public.roles r on r.slug = m.slug
               order by m.rang)
  from (
    select t.id, t.score, count(*) over () as total,
           row_number() over (order by t.score desc, (t.avatar_url is not null) desc, t.full_name) as rang
    from tous t
    order by rang
    limit greatest(p_limite, 0)
  ) x
  order by x.rang;
$$;
