-- =====================================================================
-- Adhésions et accès payant — stub sans intégration de paiement réelle.
-- Les tables sont conçues pour brancher un webhook (Stripe ou autre)
-- plus tard sans migration de schéma supplémentaire : il suffira alors
-- de faire écrire le webhook dans memberships/membership_events au lieu
-- de l'admin.
-- =====================================================================

do $$ begin
  create type public.membership_status as enum
    ('en_attente_paiement', 'active', 'expiree', 'annulee');
exception when duplicate_object then null;
end $$;


-- ---------------------------------------------------------------------
-- 1. Catalogue des offres (public, lecture ouverte).
-- ---------------------------------------------------------------------
create table if not exists public.membership_plans (
  slug                    text primary key,
  label                   text not null,
  price_cents             int  not null,
  currency                text not null default 'EUR',
  applies_to              public.profile_category,
  description             text,
  included_project_unlocks int not null default 0,
  included_free_readings  int not null default 0,
  is_active               boolean not null default true
);

insert into public.membership_plans
  (slug, label, price_cents, applies_to, description, included_project_unlocks, included_free_readings)
values
  ('adhesion_auteur_50', 'Adhésion Auteur', 5000, 'auteur',
   'Analyse gratuite d''1 document PDF et accès à la Pitchothèque (videopitch et contacts non accessibles).',
   0, 1),
  ('adhesion_pt_50', 'Adhésion Producteur / Talent', 5000, null,
   'Accès à la Pitchothèque et 5 projets gratuits à trouver par mots-clés, avec videopitch et contact débloqués pour ces projets.',
   5, 0),
  ('accompagnement_500', 'Accompagnement sur mesure', 50000, null,
   'Accompagnement sur plusieurs semaines — pour les Auteurs sur un document PDF, pour les profils Producteur/Talent sur la recherche de projets. Contenu à définir.',
   0, 0)
on conflict (slug) do nothing;

alter table public.membership_plans enable row level security;

drop policy if exists "offres lisibles par tous" on public.membership_plans;
create policy "offres lisibles par tous"
  on public.membership_plans for select using (true);

drop policy if exists "seul un admin gère les offres" on public.membership_plans;
create policy "seul un admin gère les offres"
  on public.membership_plans for all
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 2. Adhésion d'un profil. Le statut est basculé manuellement par
--    l'admin tant qu'aucun fournisseur de paiement n'est branché.
-- ---------------------------------------------------------------------
create table if not exists public.memberships (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references public.profiles(id) on delete cascade,
  plan_slug          text not null references public.membership_plans(slug),
  status             public.membership_status not null default 'en_attente_paiement',
  amount_cents       int,
  currency           text,
  payment_provider   text,
  payment_reference  text,
  free_readings_used int not null default 0,
  started_at         timestamptz,
  expires_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists memberships_profile_idx on public.memberships (profile_id);

alter table public.memberships enable row level security;

drop policy if exists "adhésions visibles par leur titulaire et l'admin" on public.memberships;
create policy "adhésions visibles par leur titulaire et l'admin"
  on public.memberships for select
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "chacun démarre sa demande d'adhésion" on public.memberships;
create policy "chacun démarre sa demande d'adhésion"
  on public.memberships for insert
  with check (profile_id = auth.uid() and status = 'en_attente_paiement');

-- Le passage à "active" (et tout le reste) est réservé à l'admin tant
-- que le paiement est stubé : personne ne doit pouvoir s'auto-activer.
drop policy if exists "seul un admin fait évoluer une adhésion" on public.memberships;
create policy "seul un admin fait évoluer une adhésion"
  on public.memberships for update
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 3. Journal append-only des événements de paiement — futur point
--    d'entrée d'un webhook, alimenté manuellement par l'admin pour le
--    moment via record_membership_event().
-- ---------------------------------------------------------------------
create table if not exists public.membership_events (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  event_type    text not null,
  payload       jsonb,
  created_at    timestamptz not null default now()
);

alter table public.membership_events enable row level security;

drop policy if exists "journal d'adhésion réservé à l'admin" on public.membership_events;
create policy "journal d'adhésion réservé à l'admin"
  on public.membership_events for select using (public.is_admin());

create or replace function public.record_membership_event(
  p_membership_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  insert into public.membership_events (membership_id, event_type, payload)
  values (p_membership_id, p_event_type, p_payload)
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.record_membership_event(uuid, text, jsonb) to authenticated;


-- ---------------------------------------------------------------------
-- 4. Les projets débloqués par une adhésion Producteur/Talent (5 max,
--    plafonnés par le plan).
-- ---------------------------------------------------------------------
create table if not exists public.membership_project_unlocks (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,
  unlocked_at   timestamptz not null default now(),
  unique (membership_id, project_id)
);

create or replace function public.enforce_unlock_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quota int;
  used  int;
begin
  select mp.included_project_unlocks into quota
  from public.memberships m
  join public.membership_plans mp on mp.slug = m.plan_slug
  where m.id = new.membership_id;

  select count(*) into used
  from public.membership_project_unlocks
  where membership_id = new.membership_id;

  if used >= coalesce(quota, 0) then
    raise exception 'Quota de projets débloqués atteint pour cette adhésion';
  end if;

  return new;
end;
$$;

drop trigger if exists on_unlock_quota on public.membership_project_unlocks;
create trigger on_unlock_quota
  before insert on public.membership_project_unlocks
  for each row execute function public.enforce_unlock_quota();

alter table public.membership_project_unlocks enable row level security;

drop policy if exists "déblocages visibles par leur titulaire et l'admin" on public.membership_project_unlocks;
create policy "déblocages visibles par leur titulaire et l'admin"
  on public.membership_project_unlocks for select
  using (
    public.is_admin()
    or exists (select 1 from public.memberships m where m.id = membership_id and m.profile_id = auth.uid())
  );

drop policy if exists "chacun débloque un projet avec son adhésion active" on public.membership_project_unlocks;
create policy "chacun débloque un projet avec son adhésion active"
  on public.membership_project_unlocks for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id and m.profile_id = auth.uid() and m.status = 'active'
    )
  );


-- ---------------------------------------------------------------------
-- 5. Extension des accès gated par une adhésion active + déblocage.
-- ---------------------------------------------------------------------
drop policy if exists "pitchs mis en avant lisibles" on public.pitches;
create policy "pitchs mis en avant lisibles"
  on public.pitches for select
  using (
    is_featured
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.membership_project_unlocks u
      join public.memberships m on m.id = u.membership_id
      where u.project_id = pitches.project_id
        and m.profile_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "contact visible par le titulaire et l'admin" on public.profile_contact_info;
create policy "contact visible par le titulaire et l'admin"
  on public.profile_contact_info for select
  using (
    auth.uid() = profile_id
    or public.is_admin()
    or exists (
      select 1 from public.membership_project_unlocks u
      join public.memberships m on m.id = u.membership_id
      join public.projects p on p.id = u.project_id
      where p.owner_id = profile_contact_info.profile_id
        and m.profile_id = auth.uid()
        and m.status = 'active'
    )
  );
