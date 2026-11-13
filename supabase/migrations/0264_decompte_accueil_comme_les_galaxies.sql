-- 13/11/2026, Sarah : les nombres de la page d'accueil étaient plus petits
-- que ceux des Galaxies pour le même mot ; « ce serait mieux d'aligner les
-- deux ». Le décompte de l'accueil passe désormais par les recherches des
-- Galaxies elles-mêmes : un seul calcul, donc les mêmes nombres.
--
-- Les recherches de talents et de personnages refusent le visiteur sans
-- compte (auth.uid()). Leur calcul passe dans une fonction interne, que
-- personne ne peut appeler de l'extérieur ; la fonction connue des Galaxies
-- garde son contrôle et l'appelle, et le décompte (des nombres, jamais de
-- contenu) l'appelle aussi.

CREATE OR REPLACE FUNCTION public.rechercher_talents_interne(q text, p_limite integer DEFAULT 60)
 RETURNS TABLE(id uuid, score real, total bigint, metiers text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
    where true
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
$function$

;

CREATE OR REPLACE FUNCTION public.rechercher_personnages_interne(q text, p_limite integer DEFAULT 60)
 RETURNS TABLE(id uuid, score real, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  -- Calculé une seule fois (sinon les formes du mot sont refaites pour
  -- chaque personnage : plus de 30 secondes).
  with terme as materialized (
    select nullif(btrim(public.sans_accent(q)), '') as mot,
           '%' || replace(replace(replace(btrim(public.sans_accent(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif,
           -- Singulier / pluriel, masculin / féminin (05/11, Sarah).
           public.rx_formes(lower(btrim(public.sans_accent(q)))) as rx
  ),
  par_texte as (
    select c.id,
      greatest(
        case when lower(public.sans_accent(c.name)) = lower(t.mot) then 0.95
             when public.contient(public.sans_accent(c.name), t.motif, t.rx) then 0.85 else 0 end,
        -- Le comédien imaginé par l'auteur (« Juliette Binoche »).
        case when public.contient(public.sans_accent(c.actor_name), t.motif, t.rx) then 0.80 else 0 end,
        case when public.contient(public.sans_accent(c.biography), t.motif, t.rx) then 0.60 else 0 end
      ) as score
    from public.characters c, terme t
    where t.mot is not null
      and (public.contient(public.sans_accent(c.name), t.motif, t.rx) or public.contient(public.sans_accent(c.actor_name), t.motif, t.rx)
           or public.contient(public.sans_accent(c.biography), t.motif, t.rx))
  ),
  par_projet as (
    select c.id, r.score * 0.5 as score
    from public.rechercher_projets(q, 1000) r
    join public.characters c on c.project_id = r.id
    where (select count(*) from public.mots_de_recherche(q)) < 2
  ),
  crit_mots as (select * from public.criteres_de_recherche(q)),
  par_mot_cle as (
    select ck.character_id as id,
           0.45 + 0.45 * count(distinct c.critere)::real
                  / (select count(distinct critere) from crit_mots) as score
    from crit_mots c
    join public.character_keywords ck on ck.keyword_id = c.keyword_id
    group by ck.character_id
    having count(distinct c.critere) = (select count(distinct critere) from crit_mots)
  ),
  tous as (
    select u.id, max(u.score) as score
    from (select * from par_texte union all select * from par_projet union all select * from par_mot_cle) u
    group by u.id
  )
  select t.id, t.score::real, count(*) over () as total
  from tous t
  join public.characters c on c.id = t.id
  join public.projects p on p.id = c.project_id
  where true
    and p.is_public
    and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
  -- À score égal, ceux qui ont un portrait d'abord.
  order by t.score desc, (c.photo_path is not null) desc, c.name
  limit greatest(p_limite, 0);
$function$

;

revoke all on function public.rechercher_talents_interne(text, integer), public.rechercher_personnages_interne(text, integer) from public, anon, authenticated;

create or replace function public.rechercher_talents(q text, p_limite integer default 60)
returns table(id uuid, score real, total bigint, metiers text[])
language sql stable security definer
set search_path to 'public', 'extensions'
as $$
  select * from public.rechercher_talents_interne(q, p_limite) where auth.uid() is not null;
$$;

create or replace function public.rechercher_personnages(q text, p_limite integer default 60)
returns table(id uuid, score real, total bigint)
language sql stable security definer
set search_path to 'public', 'extensions'
as $$
  select * from public.rechercher_personnages_interne(q, p_limite) where auth.uid() is not null;
$$;

-- Le décompte : les totaux des trois recherches. Pour les projets, le sens
-- complète les lettres comme dans les Galaxies (actions.ts : au plus 300
-- fiches, proximité 0,4 au moins, et seulement quand la liste par les
-- lettres tient en 1 000) ; le vecteur du mot est calculé par le site.
drop function if exists public.compter_recherche(text);
drop function if exists public.compter_recherche(text, text);
-- p_partie : le site demande les trois nombres en même temps, un par appel
-- (« projets », « talents », « personnages ») ; sans lui, les trois à la suite.
create or replace function public.compter_recherche(q text, p_vecteur text default null, p_partie text default null)
returns table(projets bigint, talents bigint, personnages bigint)
language sql stable security definer
set search_path to 'public', 'extensions'
as $$
  with lettres as materialized (
    select r.id, r.total from public.rechercher_projets(q, 1000) r
  ),
  total_lettres as materialized (
    select coalesce((select max(total) from lettres), 0) as n
  ),
  sens as (
    select count(*) as n
    from public.projets_par_sens(p_vecteur::extensions.vector, 300) s
    where p_vecteur is not null
      and s.proximite >= 0.4
      and s.id not in (select id from lettres)
      and (select n from total_lettres) <= 1000
  )
  select
    case when nullif(btrim(q), '') is null or coalesce(p_partie, 'projets') <> 'projets' then 0
         else (select n from total_lettres) + (select n from sens) end,
    case when coalesce(p_partie, 'talents') <> 'talents' then 0
         else coalesce((select t.total from public.rechercher_talents_interne(q, 1) t), 0) end,
    case when coalesce(p_partie, 'personnages') <> 'personnages' then 0
         else coalesce((select c.total from public.rechercher_personnages_interne(q, 1) c), 0) end;
$$;
grant execute on function public.compter_recherche(text, text, text) to anon, authenticated, service_role;

-- Les autres formes de chaque mot sont calculées une seule fois, et non pour
-- chacun des 28 000 mots-clés : 2,3 secondes de moins sur la recherche des
-- personnages, dans les Galaxies comme sur l'accueil. Mêmes résultats.
CREATE OR REPLACE FUNCTION public.criteres_de_recherche(q text)
 RETURNS TABLE(keyword_id bigint, critere text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  with texte as (
    select lower(public.sans_accent(coalesce(q, ''))) as t
  ),
  mots as materialized (select w, public.formes_du_mot(w) as formes from public.mots_de_recherche(q) w)
  select k.id, m.w
  from public.keywords k
  cross join mots m
  cross join lateral (select lower(public.sans_accent(k.label_fr)) as l) kl
  where kl.l = m.w
     or kl.l = any(m.formes)  -- singulier / pluriel (05/11)
     or (length(kl.l) >= 4 and position(' ' in kl.l) = 0 and m.w like kl.l || '%')
     or (length(m.w) >= 5 and kl.l like m.w || '%' and position(' ' in kl.l) = 0)
     or (length(m.w) >= 5 and position(' ' in kl.l) = 0 and similarity(kl.l, m.w) >= 0.6)
  union
  -- Un mot-clé de plusieurs mots, présent en entier dans la recherche :
  -- il compte pour chacun de ses mots.
  select k.id, m.w
  from public.keywords k, texte, mots m
  where position(' ' in k.label_fr) > 0
    and texte.t like '%' || lower(public.sans_accent(k.label_fr)) || '%'
    and lower(public.sans_accent(k.label_fr)) like '%' || m.w || '%';
$function$;

-- La recherche de projets à plusieurs mots : même accélération.
CREATE OR REPLACE FUNCTION public.rechercher_projets(q text, p_limite integer DEFAULT 60, p_format text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_budget text DEFAULT NULL::text, p_bandeau text DEFAULT NULL::text, p_equipe text DEFAULT NULL::text, p_selection text DEFAULT NULL::text, p_comedien text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, score real, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  with terme as materialized (
    -- Le texte tapé sert de motif ilike : on neutralise %, _ et \, sinon
    -- un visiteur qui tape "100 %" ferait un joker qui remonte tout.
    -- Sans accents (27/09) : « algerie » trouve « Algérie ».
    select nullif(btrim(public.sans_accent(q)), '') as mot,
           '%' || replace(replace(replace(btrim(public.sans_accent(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif,
           -- Le singulier et le pluriel (05/11, Sarah) : « animal » trouve aussi
           -- « animaux », « supermarchés » trouve « supermarché ».
           public.rx_formes(lower(btrim(public.sans_accent(q)))) as rx
  ),
  -- Les mots-clés d'abord : ce sont eux qui décrivent le mieux un projet,
  -- ils dominent donc le classement.
  mots as (
    select k.id,
      case
        when lower(public.sans_accent(k.label_fr)) = lower(t.mot)
               or lower(public.sans_accent(k.label_fr)) = any(public.formes_du_mot(lower(t.mot))) then 0.98  -- le mot-clé exact, juste derrière le titre identique
        when public.contient(public.sans_accent(k.label_fr), t.motif, t.rx) then 0.90          -- "road" dans "road trip"
        else 0.35                                        -- rattrapé par similarité (faute de frappe) : après les fiches qui contiennent le mot
      end as score
    from public.keywords k, terme t
    where t.mot is not null
      and (public.contient(public.sans_accent(k.label_fr), t.motif, t.rx) or similarity(public.sans_accent(k.label_fr), t.mot) >= 0.45)
  ),
  par_mot as (
    select pk.project_id, max(m.score) as score
    from public.project_keywords pk
    join mots m on m.id = pk.keyword_id
    group by pk.project_id
  ),
  par_texte as (
    select p.id as project_id,
      greatest(
        case when lower(public.sans_accent(p.title)) = lower(t.mot) then 1.00
             -- Le mot tapé est un mot entier du titre (23/10) : « cerveau »
             -- met « Cerveau-direct » devant les mots-clés « cerveau ».
             when public.sans_accent(p.title) ~* ('\m' || regexp_replace(t.mot, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M') then 0.99
             when public.contient(public.sans_accent(p.title), t.motif, t.rx) then 0.75 else 0 end,
        -- La tagline compte comme la logline (01/11) : onze fiches, dont
        -- « FRENCH CANCAN », y ont écrit tout leur pitch et laissé la
        -- logline vide ; « moulin rouge » ne les trouvait pas.
        case when public.contient(public.sans_accent(p.logline), t.motif, t.rx)
               or public.contient(public.sans_accent(p.tagline), t.motif, t.rx) then 0.50 else 0 end,
        -- Le pays où se déroule l'action (27/09) : « Algérie » remonte
        -- tous les projets qui s'y passent, même s'ils ne le disent pas
        -- dans leur texte. Il remplace le filtre par pays de WFG 1.
        case when public.contient(public.sans_accent(p.country), t.motif, t.rx) then 0.45 else 0 end,
        case when public.contient(public.sans_accent(p.synopsis), t.motif, t.rx) then 0.40 else 0 end,
        -- Les personnages (28/09) : leur nom et leurs quelques lignes, où
        -- l'auteur nomme le comédien qu'il imagine (« Juliette Binoche »).
        case when exists (select 1 from public.characters c where c.project_id = p.id
                           and (public.contient(public.sans_accent(c.name), t.motif, t.rx) or public.contient(public.sans_accent(c.actor_name), t.motif, t.rx) or public.contient(public.sans_accent(c.biography), t.motif, t.rx)))
             then 0.42 else 0 end,
        -- Les comédiens envisagés par l'auteur (30/09) : un directeur de
        -- casting tape « Bryan Cranston » dans le champ de recherche.
        case when exists (select 1 from public.project_actors a where a.project_id = p.id
                           and public.contient(public.sans_accent(a.libelle), t.motif, t.rx))
             then 0.70 else 0 end
      ) as score
    from public.projects p, terme t
    where t.mot is not null
      and (public.contient(public.sans_accent(p.title), t.motif, t.rx) or public.contient(public.sans_accent(p.logline), t.motif, t.rx)
           or public.contient(public.sans_accent(p.tagline), t.motif, t.rx)
           or public.contient(public.sans_accent(p.synopsis), t.motif, t.rx) or public.contient(public.sans_accent(p.country), t.motif, t.rx)
           or exists (select 1 from public.characters c where c.project_id = p.id
                      and (public.contient(public.sans_accent(c.name), t.motif, t.rx) or public.contient(public.sans_accent(c.actor_name), t.motif, t.rx) or public.contient(public.sans_accent(c.biography), t.motif, t.rx)))
           or exists (select 1 from public.project_actors a where a.project_id = p.id
                      and public.contient(public.sans_accent(a.libelle), t.motif, t.rx)))
  ),
  par_phrase as (
    select project_id, max(score) as score
    from (select * from par_mot union all select * from par_texte) u
    group by project_id
  ),
  -- Plusieurs mots = plusieurs critères, tous requis (30/09/2026, même
  -- règle que pour les talents) : « espagnol musique » ne garde que les
  -- projets qui cochent espagnol ET musique, par un mot-clé ou par leur
  -- texte. Un seul mot : la recherche d'avant, par la phrase entière.
  -- Les formes de chaque mot calculées une seule fois (13/11) : refaites pour
  -- chaque projet, une recherche de deux mots dépassait les 25 secondes
  -- (les critères cochés sont aussi calculés à part, une seule fois).
  mots_q as materialized (select w, public.rx_formes(w) as rx from public.mots_de_recherche(q) w),
  nb as materialized (select count(*)::int as n from mots_q),
  coches as materialized (
    select pk.project_id, c.critere
    from public.criteres_de_recherche(q) c
    join public.project_keywords pk on pk.keyword_id = c.keyword_id
    union
    select p.id, m.w
    from public.projects p, mots_q m
    where public.contient(public.sans_accent(concat_ws(' ', p.title, p.tagline, p.logline, p.synopsis)), '%' || m.w || '%', m.rx)
    union
    select a.project_id, m.w
    from public.project_actors a, mots_q m
    where public.contient(public.sans_accent(a.libelle), '%' || m.w || '%', m.rx)
    union
    select c.project_id, m.w
    from public.characters c, mots_q m
    where public.contient(public.sans_accent(c.actor_name), '%' || m.w || '%', m.rx)
  ),
  par_criteres as (
    -- Le classement (07/10) : tous les projets qui cochent tous les mots
    -- avaient le même score 0.9, donc le plus récent passait devant :
    -- « Les Feuilles mortes » arrivait derrière un projet qui n'en parle
    -- qu'en passant. La phrase entière dans le titre passe maintenant
    -- avant la phrase dans le texte, avant les mots épars.
    select co.project_id,
      greatest(
        0.6,
        case when lower(public.sans_accent(p.title)) = lower(t.mot) then 1.00
             when public.contient(public.sans_accent(p.title), t.motif, t.rx) then 0.95 else 0 end,
        case when public.contient(public.sans_accent(p.logline), t.motif, t.rx)
               or public.contient(public.sans_accent(p.tagline), t.motif, t.rx)
               or public.contient(public.sans_accent(p.synopsis), t.motif, t.rx) then 0.80 else 0 end
      ) as score
    from coches co
    join public.projects p on p.id = co.project_id
    cross join nb
    cross join terme t
    group by co.project_id, nb.n, p.title, p.tagline, p.logline, p.synopsis, t.mot, t.motif, t.rx
    having count(distinct co.critere) = nb.n
  ),
  tous as (
    select * from par_phrase where (select n from nb) < 2
    union all
    select * from par_criteres where (select n from nb) >= 2
  )
  select t.project_id, t.score::real, count(*) over () as total
  from tous t
  join public.projects p on p.id = t.project_id
  where p.is_public
    and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
    and (p_format is null or p.format::text = p_format)
    and (p_genre is null or p.genre_slug = p_genre)
    and (p_audience is null or p.target_audience = p_audience)
    and (p_budget is null or p.budget_range = p_budget)
    and (p_bandeau is null or (p_bandeau = 'tous' and p.bandeau is not null) or p.bandeau = p_bandeau)
      and (p_selection is null or exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle = p_selection))
      and (p_comedien is null or exists (select 1 from public.project_actors a where a.project_id = p.id and a.libelle = p_comedien))
      and (p_equipe is null or (coalesce(p.bandeau, '') not in ('tourne', 'film_prime')
           and exists (select 1 from public.project_co_authors ca
                      where ca.project_id = p.id and ca.status = 'accepte'
                        and (ca.role_slug = p_equipe
                             or (p_equipe = 'tous' and ca.role_slug in ('producteur', 'realisateur'))))))
  order by t.score desc, p.created_at desc
  limit p_limite;
$function$;
