-- 05/11/2026, Sarah : « animal » et « animaux » ne trouvaient que 54 projets
-- en commun (125 et 107). Le singulier et le pluriel comptent désormais
-- comme le même mot. La forme ajoutée doit être un mot entier : « paris »
-- n'ira pas chercher « pari » au milieu de « comparaison ».

-- Les autres formes d'un mot (minuscules, sans accent) : le singulier d'un
-- pluriel en s ou x, le passage -al / -ail ⇄ -aux, et (même jour, Sarah)
-- le masculin ⇄ le féminin par les terminaisons sûres. Une longueur minimale
-- évite les faux amis : « mère » ne donne pas « mer ». Les règles sont les
-- mêmes dans src/app/pitchotheque/mot-trouve.ts (le mot en rouge).
create or replace function public.formes_du_mot(w text)
returns text[] language sql immutable parallel safe as $$
  with b(f) as (
    select w where w ~ '^[a-z0-9]+$'
    union select left(w, -1) where w ~ '^[a-z0-9]{3,}[sx]$'
    union select left(w, -3) || 'al' where w ~ '^[a-z0-9]{2,}aux$'
    union select left(w, -3) || 'ail' where w ~ '^[a-z0-9]{2,}aux$'
    union select regexp_replace(w, '(al|ail)$', 'aux') where w ~ '^[a-z0-9]{2,}(al|ail)$'
  ),
  r(suf, rep, mini) as (values
    ('eur', 'euse', 5), ('teur', 'trice', 6), ('eux', 'euse', 5), ('f', 've', 4),
    ('euse', 'eur', 6), ('euse', 'eux', 6), ('trice', 'teur', 7), ('ive', 'if', 5),
    ('ere', 'er', 6), ('ienne', 'ien', 7), ('onne', 'on', 6), ('elle', 'el', 6),
    ('ette', 'et', 6), ('ante', 'ant', 7), ('ente', 'ent', 7), ('ate', 'at', 7), ('ine', 'in', 6)
  ),
  g(f) as (
    select f from b
    union
    select left(b.f, -length(r.suf)) || r.rep from b, r
    where length(b.f) >= r.mini and right(b.f, length(r.suf)) = r.suf
  )
  select coalesce(array_agg(distinct f) filter (where f <> w), '{}') from g;
$$;

-- Ces formes en motif « mot entier », au pluriel aussi (« actrice(s) ») ;
-- nul quand il n'y en a pas.
create or replace function public.rx_formes(w text)
returns text language sql immutable parallel safe as $$
  select case when cardinality(public.formes_du_mot(w)) = 0 then null
              else '\m(' || array_to_string(public.formes_du_mot(w), '|') || ')[sx]?\M' end;
$$;

-- Le texte contient le mot tapé, ou l'une de ses autres formes en mot entier.
create or replace function public.contient(texte text, motif text, rx text)
returns boolean language sql immutable parallel safe as $$
  select texte ilike motif or (rx is not null and texte ~* rx);
$$;

CREATE OR REPLACE FUNCTION public.rechercher_projets(q text, p_limite integer DEFAULT 60, p_format text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_budget text DEFAULT NULL::text, p_bandeau text DEFAULT NULL::text, p_equipe text DEFAULT NULL::text, p_selection text DEFAULT NULL::text, p_comedien text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, score real, total bigint)
 LANGUAGE sql
 STABLE
AS $function$
  with terme as (
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
  mots_q as (select w from public.mots_de_recherche(q) w),
  nb as (select count(*)::int as n from mots_q),
  coches as (
    select pk.project_id, c.critere
    from public.criteres_de_recherche(q) c
    join public.project_keywords pk on pk.keyword_id = c.keyword_id
    union
    select p.id, m.w
    from public.projects p, mots_q m
    where public.contient(public.sans_accent(concat_ws(' ', p.title, p.tagline, p.logline, p.synopsis)), '%' || m.w || '%', public.rx_formes(m.w))
    union
    select a.project_id, m.w
    from public.project_actors a, mots_q m
    where public.contient(public.sans_accent(a.libelle), '%' || m.w || '%', public.rx_formes(m.w))
    union
    select c.project_id, m.w
    from public.characters c, mots_q m
    where public.contient(public.sans_accent(c.actor_name), '%' || m.w || '%', public.rx_formes(m.w))
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

CREATE OR REPLACE FUNCTION public.criteres_de_recherche(q text)
 RETURNS TABLE(keyword_id bigint, critere text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  with texte as (
    select lower(public.sans_accent(coalesce(q, ''))) as t
  ),
  mots as (select w from public.mots_de_recherche(q) w)
  select k.id, m.w
  from public.keywords k
  cross join mots m
  cross join lateral (select lower(public.sans_accent(k.label_fr)) as l) kl
  where kl.l = m.w
     or kl.l = any(public.formes_du_mot(m.w))  -- singulier / pluriel (05/11)
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

-- Le trait des Galaxies : « animaux » sur la fiche compte comme le mot visible
-- quand on a tapé « animal ».
CREATE OR REPLACE FUNCTION public.projets_mot_visible(q text, p_projets uuid[])
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  with mots as (
    select w, '%' || replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif,
           public.rx_formes(w) as rx
    from public.mots_de_recherche(q) w
  ),
  -- Une recherche sans mot de trois lettres (« ok ») : le texte entier.
  motifs as (
    select motif, rx from mots
    union all
    select '%' || replace(replace(replace(public.sans_accent(btrim(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%', null
    where not exists (select 1 from mots) and nullif(btrim(q), '') is not null
  ),
  textes as (
    select p.id,
           public.sans_accent(concat_ws(' ', p.title, p.tagline, p.logline, p.synopsis, p.country,
             (select string_agg(concat_ws(' ', c.name, c.actor_name, c.biography), ' ') from public.characters c where c.project_id = p.id),
             (select string_agg(a.libelle, ' ') from public.project_actors a where a.project_id = p.id))) as texte
    from public.projects p
    where p.id = any(p_projets)
  )
  select t.id
  from textes t
  where auth.uid() is not null
    and not exists (select 1 from motifs m where not public.contient(t.texte, m.motif, m.rx));
$function$;
