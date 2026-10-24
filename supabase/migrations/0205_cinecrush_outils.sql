-- CinéCrush, suite (24/10/2026) : l'heure de fin de la semaine en cours
-- (pour le chrono) et les candidats proposés à l'administration.

-- Le dimanche minuit (heure de Paris) qui ferme la semaine en cours.
create or replace function public.cinecrush_fin_de_semaine()
returns timestamptz language sql stable as $$
  select ((public.dimanche_de_la_semaine() + 7)::timestamp) at time zone 'Europe/Paris';
$$;

-- Les candidats : projets visibles, avec vignette et videopitch, jamais
-- CinéCrush, les fiches les mieux remplies d'abord. L'« aide de l'IA »
-- promise à Sarah : une liste courte, elle tranche.
create or replace function public.cinecrush_candidats(p_limite integer default 60)
returns table (id uuid, title text, auteur text, personnages bigint, remplissage integer)
language sql stable security definer set search_path to 'public' as $$
  select p.id, p.title, pr.full_name as auteur,
         (select count(*) from public.characters c where c.project_id = p.id) as personnages,
         (case when coalesce(btrim(p.tagline), '') <> '' then 1 else 0 end
          + case when coalesce(btrim(p.logline), '') <> '' then 1 else 0 end
          + case when coalesce(btrim(p.synopsis), '') <> '' then 1 else 0 end
          + case when exists (select 1 from public.characters c where c.project_id = p.id) then 1 else 0 end
          + case when exists (select 1 from public.project_files f where f.project_id = p.id and f.kind = 'scenario') then 1 else 0 end) as remplissage
  from public.projects p
  left join public.profiles pr on pr.id = p.owner_id
  where public.is_admin()
    and p.is_public
    and p.a_videopitch
    and exists (select 1 from public.project_files f where f.project_id = p.id and f.kind = 'vignette')
    and not exists (select 1 from public.cinecrush c where c.project_id = p.id)
  order by remplissage desc, p.updated_at desc, p.title
  limit p_limite;
$$;
