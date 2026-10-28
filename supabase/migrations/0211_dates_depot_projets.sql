-- La date de dépôt de chaque projet, pour l'écran des membres (28/10/2026,
-- Sarah : « afficher les dates de dépôt avant le bouton de téléchargement »).
-- Les projets repris de WFG 1 portent tous la date de la reprise (19/09) :
-- leur vraie date est celle de WFG 1 (wfg1.projects.date). Les autres :
-- la date de création sur WFG 2. Administration seulement.
create or replace function public.dates_depot_projets(ids uuid[])
returns table (project_id uuid, depose_le timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         coalesce(
           case when w.date ~ '^\d{4}-\d{2}-\d{2}' then w.date::timestamp at time zone 'Europe/Paris' end,
           p.created_at)
  from public.projects p
  left join wfg1.projects w on w.project_id::text = p.legacy_id
  where p.id = any(ids) and public.is_admin();
$$;

revoke all on function public.dates_depot_projets(uuid[]) from public, anon;
grant execute on function public.dates_depot_projets(uuid[]) to authenticated, service_role;
