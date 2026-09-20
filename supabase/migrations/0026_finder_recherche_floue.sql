-- =====================================================================
-- Le Finder : recherche floue sur les projets publics.
--
-- pg_trgm (extension Postgres native, gratuite) compare les mots par
-- similarité de "trigrammes" plutôt que par égalité exacte : chercher
-- "road" retrouve un mot-clé "road trip", une faute de frappe ou une
-- terminaison différente ne bloque pas la recherche. Pas d'appel API
-- payant, pas d'IA à la frappe — voir la note de session sur le sujet.
-- =====================================================================

create extension if not exists pg_trgm;

create index if not exists projects_title_trgm_idx
  on public.projects using gin (title gin_trgm_ops);

create index if not exists projects_logline_trgm_idx
  on public.projects using gin (logline gin_trgm_ops);

create index if not exists keywords_label_trgm_idx
  on public.keywords using gin (label_fr gin_trgm_ops);

create or replace function public.rechercher_projets(q text, p_limite int default 60)
returns table (id uuid, score real)
language sql
stable
as $$
  select p.id,
    greatest(
      coalesce(similarity(p.title, q), 0),
      coalesce(similarity(p.logline, q), 0),
      coalesce((
        select max(similarity(k.label_fr, q))
        from public.project_keywords pk
        join public.keywords k on k.id = pk.keyword_id
        where pk.project_id = p.id
      ), 0)
    ) as score
  from public.projects p
  where p.is_public
    and (
      p.title % q
      or p.logline % q
      or exists (
        select 1
        from public.project_keywords pk
        join public.keywords k on k.id = pk.keyword_id
        where pk.project_id = p.id and k.label_fr % q
      )
    )
  order by score desc
  limit p_limite;
$$;

grant execute on function public.rechercher_projets(text, int) to anon, authenticated;
