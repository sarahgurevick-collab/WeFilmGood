-- Mémoire des envois faits à la Maison des Scénaristes (30/10/2026, Sarah).
-- Les fiches créées depuis les boîtes de la Maison (imported_from =
-- 'boites_mds') portent la date de création du 30/10/2026. Pour l'email de
-- lancement de WFG 2, Sarah doit pouvoir nommer le projet ENVOYÉ et son année
-- (parfois plus de dix ans) : cette table garde la date de l'email d'envoi.
-- Quand une personne a écrit depuis plusieurs adresses, celles qui n'ont pas
-- été gardées sont conservées à part. Administration seulement.

create table if not exists public.projets_envois_maison (
  project_id uuid primary key references public.projects(id) on delete cascade,
  envoye_le date,
  objet text,
  fil_gmail text,
  source_date text
);

create table if not exists public.profils_autres_adresses (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  origine text not null default 'boites_mds',
  note text,
  primary key (profile_id, email)
);

alter table public.projets_envois_maison enable row level security;
alter table public.profils_autres_adresses enable row level security;
revoke all on public.projets_envois_maison, public.profils_autres_adresses from anon, authenticated;

-- La date de dépôt de l'écran des membres prend la date de l'envoi à la
-- Maison quand elle existe (voir 0211).
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
           e.envoye_le::timestamp at time zone 'Europe/Paris',
           p.created_at)
  from public.projects p
  left join wfg1.projects w on w.project_id::text = p.legacy_id
  left join public.projets_envois_maison e on e.project_id = p.id
  where p.id = any(ids) and public.is_admin();
$$;

revoke all on function public.dates_depot_projets(uuid[]) from public, anon;
grant execute on function public.dates_depot_projets(uuid[]) to authenticated, service_role;
