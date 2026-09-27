-- Les vecteurs de sens des mots-clés (27/09/2026) : calculés sur le
-- serveur par un petit modèle multilingue (src/lib/vecteurs.ts), 384
-- coordonnées par mot. La recherche s'en sert quand les lettres ne
-- suffisent pas : « sardine » remonte les projets de « poisson », « pêche »,
-- « mer ». Les nouveaux mots-clés reçoivent leur vecteur par le rattrapage
-- horaire (/api/vecteurs/rattrapage).
create extension if not exists vector with schema extensions;

alter table public.keywords add column if not exists vecteur extensions.vector(384);

create index if not exists keywords_vecteur_idx
  on public.keywords using hnsw (vecteur extensions.vector_cosine_ops);

-- Les mots-clés les plus proches d'un vecteur, avec leur usage sur les
-- projets visibles. « proximite » va de 0 à 1 (1 = même sens).
create or replace function public.mots_cles_par_sens(p_vecteur extensions.vector, p_limite integer default 30)
returns table (keyword_id bigint, label_fr text, effectif bigint, proximite real)
language sql
stable
security definer
set search_path = ''
as $$
  with proches as (
    select k.id, k.label_fr, 1 - (k.vecteur operator(extensions.<=>) p_vecteur) as proximite
    from public.keywords k
    where k.vecteur is not null
    order by k.vecteur operator(extensions.<=>) p_vecteur
    limit p_limite
  )
  select p.id, p.label_fr,
    (select count(*) from public.project_keywords pk
      join public.projects pr on pr.id = pk.project_id
      where pk.keyword_id = p.id and pr.is_public) as effectif,
    p.proximite::real
  from proches p
  order by p.proximite desc;
$$;

grant execute on function public.mots_cles_par_sens(extensions.vector, integer) to anon, authenticated, service_role;

-- Les mots-clés sans vecteur : ce que le rattrapage doit calculer.
create or replace function public.mots_cles_sans_vecteur(p_limite integer default 500)
returns table (id bigint, label_fr text)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, k.label_fr from public.keywords k where k.vecteur is null order by k.id limit p_limite;
$$;

grant execute on function public.mots_cles_sans_vecteur(integer) to service_role;
