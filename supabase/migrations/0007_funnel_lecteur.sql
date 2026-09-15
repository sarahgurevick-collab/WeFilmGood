-- =====================================================================
-- Funnel de lecture et de labellisation — la pièce centrale de WFG.
-- Un lecteur est assigné à un projet, rédige une fiche de lecture notée
-- sur 200, et le franchissement du seuil de 150 labellise le projet
-- après une double validation (lecteur puis admin).
--
-- Règle d'anonymat stricte : l'auteur du projet n'a JAMAIS de policy de
-- lecture directe sur reading_assignments/reading_reports. Il passe
-- obligatoirement par la fonction get_project_reading_report(), qui ne
-- lui expose que le prénom du lecteur — même logique que
-- check_reader_code()/is_admin() déjà en place.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Nouveau statut de projet : lecture terminée, non labellisé.
--    Statement isolé (restriction Postgres sur ALTER TYPE ... ADD VALUE).
-- ---------------------------------------------------------------------
alter type public.project_status add value if not exists 'lecture_terminee_non_labellise';


-- ---------------------------------------------------------------------
-- 2. Assignation d'un projet à un lecteur.
-- ---------------------------------------------------------------------
do $$ begin
  create type public.reading_assignment_status as enum
    ('proposee', 'en_cours', 'rendue', 'refusee');
exception when duplicate_object then null;
end $$;

create table if not exists public.reading_assignments (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  reader_id      uuid not null references public.profiles(id),
  status         public.reading_assignment_status not null default 'proposee',
  assigned_by    uuid references public.profiles(id),
  assigned_at    timestamptz not null default now(),
  responded_at   timestamptz,
  refusal_reason text,
  created_at     timestamptz not null default now()
);

create index if not exists reading_assignments_project_idx on public.reading_assignments (project_id);
create index if not exists reading_assignments_reader_idx  on public.reading_assignments (reader_id);

alter table public.projects add column if not exists reader_refusal_count int not null default 0;

create or replace function public.bump_reader_refusal_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'refusee' and old.status is distinct from 'refusee' then
    update public.projects
    set reader_refusal_count = reader_refusal_count + 1
    where id = new.project_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_reading_assignment_refused on public.reading_assignments;
create trigger on_reading_assignment_refused
  after update on public.reading_assignments
  for each row execute function public.bump_reader_refusal_count();

alter table public.reading_assignments enable row level security;

-- Ni le titulaire du projet ni personne d'autre que le lecteur assigné
-- et l'admin ne doit pouvoir lire cette table : c'est ce qui protège
-- l'anonymat du lecteur vis-à-vis de l'auteur.
drop policy if exists "assignations réservées au lecteur et à l'admin" on public.reading_assignments;
create policy "assignations réservées au lecteur et à l'admin"
  on public.reading_assignments for select
  using (reader_id = auth.uid() or public.is_admin());

drop policy if exists "le lecteur répond à son assignation" on public.reading_assignments;
create policy "le lecteur répond à son assignation"
  on public.reading_assignments for update
  using (reader_id = auth.uid() or public.is_admin())
  with check (reader_id = auth.uid() or public.is_admin());

drop policy if exists "l'admin crée les assignations" on public.reading_assignments;
create policy "l'admin crée les assignations"
  on public.reading_assignments for insert
  with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 3. Fiche de lecture.
-- ---------------------------------------------------------------------
do $$ begin
  create type public.reading_report_status as enum
    ('soumise', 'validee_admin', 'rejetee_admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reading_report_payment_status as enum
    ('non_due', 'due', 'payee');
exception when duplicate_object then null;
end $$;

create table if not exists public.reading_reports (
  id                 uuid primary key default gen_random_uuid(),
  assignment_id      uuid not null unique references public.reading_assignments(id) on delete cascade,
  project_id         uuid not null references public.projects(id) on delete cascade,
  reader_id          uuid not null references public.profiles(id),
  content            text,
  score              smallint check (score between 0 and 200),
  labellise          boolean generated always as (coalesce(score, 0) > 150) stored,
  status             public.reading_report_status not null default 'soumise',
  payment_status     public.reading_report_payment_status not null default 'due',
  paid_at            timestamptz,
  admin_validated_by uuid references public.profiles(id),
  admin_validated_at timestamptz,
  submitted_at       timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

create index if not exists reading_reports_project_idx on public.reading_reports (project_id);
create index if not exists reading_reports_reader_idx  on public.reading_reports (reader_id);

alter table public.reading_reports enable row level security;

drop policy if exists "fiches de lecture réservées au lecteur et à l'admin" on public.reading_reports;
create policy "fiches de lecture réservées au lecteur et à l'admin"
  on public.reading_reports for select
  using (reader_id = auth.uid() or public.is_admin());

drop policy if exists "le lecteur rédige sa fiche" on public.reading_reports;
create policy "le lecteur rédige sa fiche"
  on public.reading_reports for insert
  with check (
    reader_id = auth.uid()
    and exists (
      select 1 from public.reading_assignments a
      where a.id = assignment_id and a.reader_id = auth.uid()
    )
  );

-- Le lecteur ne peut modifier que le contenu/la note de sa propre fiche,
-- et seulement tant qu'elle reste au statut "soumise" : le WITH CHECK
-- l'empêche de se substituer à l'admin en passant lui-même sa fiche à
-- "validee_admin". Seul un admin peut faire franchir ce statut.
drop policy if exists "le lecteur modifie sa fiche tant qu'elle n'est pas validée" on public.reading_reports;
create policy "le lecteur modifie sa fiche tant qu'elle n'est pas validée"
  on public.reading_reports for update
  using (reader_id = auth.uid() or public.is_admin())
  with check (public.is_admin() or (reader_id = auth.uid() and status = 'soumise'));


-- ---------------------------------------------------------------------
-- 4. Notation de la fiche par l'auteur (1 à 5 étoiles), uniquement
--    après validation admin, et uniquement par le titulaire du projet.
-- ---------------------------------------------------------------------
create table if not exists public.reading_report_ratings (
  reading_report_id uuid primary key references public.reading_reports(id) on delete cascade,
  rated_by           uuid not null references public.profiles(id),
  stars              smallint not null check (stars between 1 and 5),
  rated_at           timestamptz not null default now()
);

alter table public.reading_report_ratings enable row level security;

drop policy if exists "notation lisible par le lecteur, l'auteur et l'admin" on public.reading_report_ratings;
create policy "notation lisible par le lecteur, l'auteur et l'admin"
  on public.reading_report_ratings for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.reading_reports r
      where r.id = reading_report_id and r.reader_id = auth.uid()
    )
    or exists (
      select 1 from public.reading_reports r
      join public.projects p on p.id = r.project_id
      where r.id = reading_report_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "l'auteur note la fiche validée de son projet" on public.reading_report_ratings;
create policy "l'auteur note la fiche validée de son projet"
  on public.reading_report_ratings for insert
  with check (
    rated_by = auth.uid()
    and exists (
      select 1 from public.reading_reports r
      join public.projects p on p.id = r.project_id
      where r.id = reading_report_id
        and p.owner_id = auth.uid()
        and r.status = 'validee_admin'
    )
  );


-- ---------------------------------------------------------------------
-- 5. Validation admin : bascule le statut du projet et libère le
--    lecteur une fois qu'il n'a plus d'assignation en cours.
-- ---------------------------------------------------------------------
create or replace function public.apply_reading_report_validation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'validee_admin' and old.status is distinct from 'validee_admin' then
    update public.projects
    set status = case when new.labellise then 'labellise' else 'lecture_terminee_non_labellise' end
    where id = new.project_id;

    update public.reading_assignments
    set status = 'rendue', responded_at = coalesce(responded_at, now())
    where id = new.assignment_id;

    update public.reader_profiles
    set availability_status = 'vert', updated_at = now()
    where profile_id = new.reader_id
      and not exists (
        select 1 from public.reading_assignments a
        where a.reader_id = new.reader_id and a.status = 'en_cours'
      );
  end if;
  return new;
end;
$$;

drop trigger if exists on_reading_report_validated on public.reading_reports;
create trigger on_reading_report_validated
  after update on public.reading_reports
  for each row execute function public.apply_reading_report_validation();


-- ---------------------------------------------------------------------
-- 6. Accès anonymisé de l'auteur à la fiche de lecture de son projet :
--    seul le prénom du lecteur est exposé, jamais son nom complet.
-- ---------------------------------------------------------------------
create or replace function public.get_project_reading_report(p_project_id uuid)
returns table (
  report_id         uuid,
  content           text,
  score             smallint,
  labellise         boolean,
  reader_first_name text,
  submitted_at      timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.content, r.score, r.labellise,
         split_part(p.full_name, ' ', 1), r.submitted_at
  from public.reading_reports r
  join public.projects pr on pr.id = r.project_id
  join public.profiles p on p.id = r.reader_id
  where r.project_id = p_project_id
    and r.status = 'validee_admin'
    and pr.owner_id = auth.uid();
$$;

grant execute on function public.get_project_reading_report(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 7. Tableau de bord admin — "Liste des projets en attente" (8 colonnes).
-- ---------------------------------------------------------------------
create or replace function public.admin_pending_projects()
returns table (
  project_id           uuid,
  author_name          text,
  author_email         text,
  title                text,
  format               public.project_format,
  language             text,
  submitted_at         timestamptz,
  current_reader_id    uuid,
  current_reader_name  text,
  reader_refusal_count int,
  reading_status       text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    author.full_name,
    au.email,
    p.title,
    p.format,
    p.language,
    p.created_at,
    la.reader_id,
    reader.full_name,
    p.reader_refusal_count,
    coalesce(la.status::text, 'sans_lecteur')
  from public.projects p
  join public.profiles author on author.id = p.owner_id
  join auth.users au on au.id = p.owner_id
  left join lateral (
    select a.reader_id, a.status
    from public.reading_assignments a
    where a.project_id = p.id
    order by a.assigned_at desc
    limit 1
  ) la on true
  left join public.profiles reader on reader.id = la.reader_id
  where public.is_admin()
    and p.status in ('depose', 'en_lecture')
  order by p.created_at asc;
$$;

grant execute on function public.admin_pending_projects() to authenticated;


-- ---------------------------------------------------------------------
-- 8. Réassignation d'un lecteur par l'admin (clôt l'assignation en
--    cours et notifie le nouveau lecteur — l'envoi réel de l'email est
--    géré par le worker de public.email_sends, cf. migration 0010).
-- ---------------------------------------------------------------------
create or replace function public.admin_reassign_reader(p_project_id uuid, p_reader_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_assignment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  update public.reading_assignments
  set status = 'refusee', responded_at = now()
  where project_id = p_project_id
    and status in ('proposee', 'en_cours');

  insert into public.reading_assignments (project_id, reader_id, status, assigned_by)
  values (p_project_id, p_reader_id, 'proposee', auth.uid())
  returning id into new_assignment_id;

  update public.projects
  set status = 'en_lecture'
  where id = p_project_id and status = 'depose';

  return new_assignment_id;
end;
$$;

grant execute on function public.admin_reassign_reader(uuid, uuid) to authenticated;
