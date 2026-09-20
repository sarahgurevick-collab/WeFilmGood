-- =====================================================================
-- Finder : chercher le mot À L'INTÉRIEUR des textes, au lieu de comparer
-- les textes entiers.
--
-- Deux défauts constatés en test avec la méthode précédente (opérateur
-- `%`, qui compare deux textes dans leur globalité) :
--
--  1. Faux positifs sur les mots courts qui se ressemblent : chercher
--     "chien" remontait un projet portant le mot-clé "Chine"
--     (similarity = 0.333, au-dessus du seuil par défaut de 0.3).
--  2. Recherche inopérante dans les textes longs : "exosquelette" est
--     présent dans la logline de 2 projets, la recherche renvoyait 0
--     résultat — un mot de 12 lettres face à un texte de 300 caractères
--     donne un score global minuscule, toujours sous le seuil.
--
-- On passe donc à `ilike '%mot%'` (le mot apparaît dans le texte), qui
-- reste accéléré par les index GIN trigrammes déjà en place : mesuré
-- 10-25 ms contre 170-290 ms avant, sur 5 402 projets et 3 015
-- mots-clés. C'est plus rapide, pas plus lourd.
--
-- La tolérance aux fautes de frappe est conservée là où les trigrammes
-- fonctionnent bien — sur les mots-clés, qui sont courts — avec un seuil
-- relevé à 0.45 : "thriler" trouve "thriller" (0.70), "comedie" trouve
-- "comédie" (0.45), mais "chien" ne trouve plus "Chine" (0.33).
--
-- Le synopsis devient cherchable (il ne l'était pas du tout), d'où
-- l'index qui manquait.
-- =====================================================================

create index if not exists projects_synopsis_trgm_idx
  on public.projects using gin (synopsis gin_trgm_ops);

create or replace function public.rechercher_projets(q text, p_limite int default 60)
returns table (id uuid, score real, total bigint)
language sql
stable
as $$
  with terme as (
    -- Le texte tapé sert de motif ilike : on neutralise %, _ et \, sinon
    -- un visiteur qui tape "100 %" ferait un joker qui remonte tout.
    select nullif(btrim(q), '') as mot,
           '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  -- Les mots-clés d'abord : ce sont eux qui décrivent le mieux un projet,
  -- ils dominent donc le classement.
  mots as (
    select k.id,
      case
        when lower(k.label_fr) = lower(t.mot) then 1.00  -- le mot-clé exact
        when k.label_fr ilike t.motif then 0.90          -- "road" dans "road trip"
        else 0.60                                        -- rattrapé par similarité (faute de frappe)
      end as score
    from public.keywords k, terme t
    where t.mot is not null
      and (k.label_fr ilike t.motif or similarity(k.label_fr, t.mot) >= 0.45)
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
        case when lower(p.title) = lower(t.mot) then 0.95
             when p.title ilike t.motif then 0.75 else 0 end,
        case when p.logline ilike t.motif then 0.50 else 0 end,
        case when p.synopsis ilike t.motif then 0.40 else 0 end
      ) as score
    from public.projects p, terme t
    where t.mot is not null
      and (p.title ilike t.motif or p.logline ilike t.motif or p.synopsis ilike t.motif)
  ),
  tous as (
    select project_id, max(score) as score
    from (select * from par_mot union all select * from par_texte) u
    group by project_id
  )
  select t.project_id, t.score::real, count(*) over () as total
  from tous t
  join public.projects p on p.id = t.project_id
  where p.is_public
  order by t.score desc, p.created_at desc
  limit p_limite;
$$;

grant execute on function public.rechercher_projets(text, int) to anon, authenticated;
