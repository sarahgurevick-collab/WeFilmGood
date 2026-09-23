-- =====================================================================
-- Le statut des fiches de lecture reprises de WFG 1.
--
-- L'import (0032) a repris toutes les fiches sans regarder leur statut
-- sur l'ancien site : 0 = attribuée à un lecteur, pas encore écrite ;
-- 1 = rendue par le lecteur, en attente de la relecture de Sarah ;
-- 2 = vérifiée et publiée. Les 0 et 1 s'affichaient donc à l'auteur
-- comme des fiches publiées : 5 fiches jamais relues, 14 fiches vides.
-- Aucun compte repris ne s'était encore connecté (23/09/2026) : rien
-- n'a été vu.
--
-- Désormais l'auteur, et le compteur public, ne voient que les fiches
-- vérifiées. L'administration continue de tout lire : les fiches rendues
-- s'affichent en « À valider » (A orange) dans /admin/fiches et dans les
-- projets en attente — il y en a parfois une cinquantaine. Rien n'est
-- validé ni publié ici.
-- =====================================================================

alter table public.legacy_reading_reports
  add column if not exists statut smallint not null default 2
  check (statut in (0, 1, 2));

comment on column public.legacy_reading_reports.statut is
  'Statut sur WFG 1 : 0 attribuée non écrite, 1 rendue à relire, 2 vérifiée (seule visible de l''auteur).';

update public.legacy_reading_reports l
set statut = r.status
from wfg1.projects_review r
where r.review_id = l.legacy_review_id
  and r.status in (0, 1)
  and l.statut <> r.status;


create or replace function public.get_legacy_reading_reports(p_project_id uuid)
returns table (
  legacy_review_id integer,
  content text,
  final_mark smallint,
  wfg_review text,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.legacy_review_id, r.content, r.final_mark, r.wfg_review, r.read_at
  from public.legacy_reading_reports r
  join public.projects p on p.id = r.project_id
  where r.project_id = p_project_id
    and ((r.statut = 2 and p.owner_id = auth.uid()) or public.is_admin())
  order by r.read_at desc nulls last;
$$;


create or replace function public.nombre_fiches_lecture(p_project_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then 0 else (
    (select count(*) from public.legacy_reading_reports l
     where l.project_id = p_project_id and l.statut = 2)
    + (select count(*) from public.reading_reports r
       join public.reading_report_publications pub on pub.reading_report_id = r.id
       where r.project_id = p_project_id and r.status = 'validee_admin')
  )::integer end;
$$;
