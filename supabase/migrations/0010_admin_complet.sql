-- =====================================================================
-- Compléments admin : emails, modération, CGUV, annuaire des profils.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Emails — création/gestion de templates, envoi consommé par un
--    worker externe (Edge Function ou cron), hors scope de cette base.
-- ---------------------------------------------------------------------
create table if not exists public.email_templates (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  subject    text not null,
  body_html  text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_sends (
  id                   uuid primary key default gen_random_uuid(),
  template_id          uuid references public.email_templates(id),
  recipient_profile_id uuid references public.profiles(id),
  recipient_email      text not null,
  status               text not null default 'en_attente' check (status in ('en_attente', 'envoye', 'echec')),
  sent_at              timestamptz,
  error                text,
  created_by           uuid references public.profiles(id),
  created_at           timestamptz not null default now()
);

alter table public.email_templates enable row level security;
alter table public.email_sends     enable row level security;

drop policy if exists "templates email réservés à l'admin" on public.email_templates;
create policy "templates email réservés à l'admin"
  on public.email_templates for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "envois email réservés à l'admin" on public.email_sends;
create policy "envois email réservés à l'admin"
  on public.email_sends for all
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 2. Modération : signalement par tout utilisateur connecté, traitement
--    par l'admin.
-- ---------------------------------------------------------------------
create table if not exists public.moderation_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id),
  target_type text not null check (target_type in ('profile', 'project', 'reading_report')),
  target_id   uuid not null,
  reason      text,
  status      text not null default 'ouvert' check (status in ('ouvert', 'traite', 'rejete')),
  created_at  timestamptz not null default now(),
  handled_by  uuid references public.profiles(id),
  handled_at  timestamptz
);

alter table public.moderation_reports enable row level security;

drop policy if exists "signalements réservés à l'admin en lecture" on public.moderation_reports;
create policy "signalements réservés à l'admin en lecture"
  on public.moderation_reports for select using (public.is_admin());

drop policy if exists "tout connecté peut signaler" on public.moderation_reports;
create policy "tout connecté peut signaler"
  on public.moderation_reports for insert
  with check (reporter_id = auth.uid());

drop policy if exists "seul un admin traite les signalements" on public.moderation_reports;
create policy "seul un admin traite les signalements"
  on public.moderation_reports for update
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 3. Conditions Générales d'Utilisation et de Vente.
-- ---------------------------------------------------------------------
create table if not exists public.legal_documents (
  slug       text primary key,
  title      text not null,
  content    text not null default '',
  version    int  not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.legal_documents (slug, title) values
  ('cguv', 'Conditions Générales d''Utilisation et de Vente')
on conflict (slug) do nothing;

alter table public.legal_documents enable row level security;

drop policy if exists "CGUV lisibles par tous" on public.legal_documents;
create policy "CGUV lisibles par tous"
  on public.legal_documents for select using (true);

drop policy if exists "seul un admin modifie les CGUV" on public.legal_documents;
create policy "seul un admin modifie les CGUV"
  on public.legal_documents for update
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 4. Annuaire admin des utilisateurs, avec recherche/filtre/tri.
-- ---------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_search   text default null,
  p_category public.profile_category default null,
  p_country  text default null
)
returns table (
  profile_id        uuid,
  full_name         text,
  email             text,
  category          public.profile_category,
  is_reader         boolean,
  country           text,
  validation_status public.profile_validation_status,
  created_at        timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.full_name,
    au.email,
    p.category,
    exists (
      select 1 from public.profile_roles pr where pr.profile_id = p.id and pr.role_slug = 'lecteur'
    ),
    p.country,
    p.validation_status,
    p.created_at
  from public.profiles p
  join auth.users au on au.id = p.id
  where public.is_admin()
    and (p_search is null or p.full_name ilike '%' || p_search || '%')
    and (p_category is null or p.category = p_category)
    and (p_country is null or p.country = p_country)
  order by p.created_at desc;
$$;

grant execute on function public.admin_list_users(text, public.profile_category, text) to authenticated;
