-- =====================================================================
-- Séparation entre la fiche rendue par le lecteur et la fiche publiée.
--
-- Le superlecteur retravaille souvent une fiche avant publication :
-- formulations maladroites, fautes, ton à ajuster quand la note est
-- basse. Ces corrections ne doivent jamais revenir sous les yeux du
-- lecteur — il voit que son travail a été validé, rien de plus.
--
-- La fiche rendue reste donc intacte dans reading_reports, et la version
-- publiée vit dans une table distincte, fermée aux lecteurs. Une colonne
-- de plus sur reading_reports aurait été lisible par le lecteur via
-- l'API même sans être affichée : une table à part rend la fuite
-- impossible plutôt qu'improbable.
--
-- C'est aussi la note publiée, et non celle du lecteur, qui décide
-- désormais de la labellisation.
-- =====================================================================

create table if not exists public.reading_report_publications (
  reading_report_id uuid primary key references public.reading_reports(id) on delete cascade,
  content           text not null,
  score             smallint not null check (score between 0 and 200),
  labellise         boolean generated always as (score > 150) stored,
  published_by      uuid references public.profiles(id),
  published_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.reading_report_publications enable row level security;

-- Réservé aux administrateurs. L'auteur du projet n'y accède que par la
-- fonction anonymisée get_project_reading_report ; le lecteur, jamais.
drop policy if exists "fiches publiées réservées à l'admin" on public.reading_report_publications;
create policy "fiches publiées réservées à l'admin"
  on public.reading_report_publications for all
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- La labellisation suit la publication, et la note qui fait foi est
-- celle du superlecteur.
-- ---------------------------------------------------------------------
drop trigger if exists on_reading_report_validated on public.reading_reports;

create or replace function public.apply_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reading_reports;
begin
  select * into v_report from public.reading_reports where id = new.reading_report_id;

  update public.projects
  set status = (case
                  when new.labellise then 'labellise'
                  else 'lecture_terminee_non_labellise'
                end)::public.project_status
  where id = v_report.project_id;

  update public.reading_reports
  set status = 'validee_admin',
      admin_validated_by = new.published_by,
      admin_validated_at = now()
  where id = new.reading_report_id;

  update public.reading_assignments
  set status = 'rendue', responded_at = coalesce(responded_at, now())
  where id = v_report.assignment_id;

  update public.reader_profiles
  set availability_status = 'vert', updated_at = now()
  where profile_id = v_report.reader_id
    and not exists (
      select 1 from public.reading_assignments a
      where a.reader_id = v_report.reader_id and a.status = 'en_cours'
    );

  return new;
end;
$$;

drop trigger if exists on_publication on public.reading_report_publications;
create trigger on_publication
  after insert or update on public.reading_report_publications
  for each row execute function public.apply_publication();


-- ---------------------------------------------------------------------
-- L'auteur lit la version publiée, jamais le brouillon du lecteur, et
-- toujours sans le nom complet de celui-ci.
-- ---------------------------------------------------------------------
drop function if exists public.get_project_reading_report(uuid);

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
  select r.id, pub.content, pub.score, pub.labellise,
         split_part(p.full_name, ' ', 1), r.submitted_at
  from public.reading_report_publications pub
  join public.reading_reports r on r.id = pub.reading_report_id
  join public.projects pr on pr.id = r.project_id
  join public.profiles p on p.id = r.reader_id
  where r.project_id = p_project_id
    and r.status = 'validee_admin'
    and pr.owner_id = auth.uid();
$$;

grant execute on function public.get_project_reading_report(uuid) to authenticated;
