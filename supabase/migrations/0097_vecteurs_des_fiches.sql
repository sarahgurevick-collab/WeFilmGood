-- Les vecteurs de sens des fiches projet (27/09/2026, suite de 0096) :
-- le titre, la tagline et la logline de chaque fiche, traduits par le
-- même modèle. La recherche par le sens porte ainsi sur le texte des
-- fiches : « sardine » trouve un projet qui parle de poissons ou de
-- pêcheurs, même sans le mot. `vecteur_empreinte` retient de quel texte
-- vient le vecteur : si la fiche change, il est recalculé au rattrapage.
alter table public.projects add column if not exists vecteur extensions.vector(384);
alter table public.projects add column if not exists vecteur_empreinte text;

create index if not exists projects_vecteur_idx
  on public.projects using hnsw (vecteur extensions.vector_cosine_ops);

/** Le texte d'une fiche qui porte son sens. */
create or replace function public.texte_du_projet(p public.projects)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(concat_ws('. ', nullif(btrim(p.title), ''), nullif(btrim(p.logline), ''), nullif(btrim(p.synopsis), '')), 700);
$$;

-- Les fiches dont le vecteur manque ou ne correspond plus au texte.
create or replace function public.projets_sans_vecteur(p_limite integer default 200)
returns table (id uuid, texte text, empreinte text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, public.texte_du_projet(p), md5(public.texte_du_projet(p))
  from public.projects p
  where public.texte_du_projet(p) is not null
    and (p.vecteur is null or p.vecteur_empreinte is distinct from md5(public.texte_du_projet(p)))
  order by p.created_at desc
  limit p_limite;
$$;

grant execute on function public.projets_sans_vecteur(integer) to service_role;

-- Les projets les plus proches d'un vecteur, avec les filtres de la
-- pitchothèque. « proximite » va de 0 à 1.
create or replace function public.projets_par_sens(
  p_vecteur extensions.vector,
  p_limite integer default 30,
  p_format text default null,
  p_genre text default null,
  p_audience text default null,
  p_budget text default null,
  p_bandeau text default null,
  p_equipe text default null
)
returns table (id uuid, proximite real)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, (1 - (p.vecteur operator(extensions.<=>) p_vecteur))::real as proximite
  from public.projects p
  where p.vecteur is not null
    and p.is_public
    -- Un titre seul ne porte pas de sens fiable (« SARI » ressemblait à
    -- « sardine ») : il faut au moins une tagline ou une logline.
    and length(coalesce(p.logline, '') || coalesce(p.synopsis, '')) >= 40
    and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
    and (p_format is null or p.format::text = p_format)
    and (p_genre is null or p.genre_slug = p_genre)
    and (p_audience is null or p.target_audience = p_audience)
    and (p_budget is null or p.budget_range = p_budget)
    and (p_bandeau is null or (p_bandeau = 'tous' and p.bandeau is not null) or p.bandeau = p_bandeau)
    and (p_equipe is null or (coalesce(p.bandeau, '') not in ('tourne', 'film_prime')
         and exists (select 1 from public.project_co_authors ca
                     where ca.project_id = p.id and ca.status = 'accepte'
                       and (ca.role_slug = p_equipe
                            or (p_equipe = 'tous' and ca.role_slug in ('producteur', 'realisateur'))))))
  order by p.vecteur operator(extensions.<=>) p_vecteur
  limit p_limite;
$$;

grant execute on function public.projets_par_sens(extensions.vector, integer, text, text, text, text, text, text) to anon, authenticated, service_role;
