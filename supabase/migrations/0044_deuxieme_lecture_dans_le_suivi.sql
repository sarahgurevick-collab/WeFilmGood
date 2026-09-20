-- =====================================================================
-- Chaque projet est lu deux fois.
--
-- Le suivi montré à l'auteur n'en mentionnait qu'une. Or la seconde
-- lecture prend du temps, et son silence est précisément ce qui pousse
-- un auteur à écrire pour demander où en est son projet.
--
-- Les deux lectures peuvent donner deux analyses distinctes quand les
-- lecteurs ne s'accordent pas, ou une analyse complétée d'un paragraphe
-- quand le second rejoint le premier. Ce détail ne regarde pas l'auteur.
--
-- L'étape « deuxième lecture » couvre aussi la validation : la fiche
-- définitive est arrêtée par l'administration, à partir des analyses.
-- =====================================================================

create or replace function public.etat_de_lecture(p_project_id uuid)
returns table (etat text, depose_le timestamptz, rendue_le timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when exists (
        select 1 from public.reading_report_publications pub
        join public.reading_reports r on r.id = pub.reading_report_id
        where r.project_id = p.id
      ) then 'disponible'
      -- Une première analyse est rendue : seconde lecture, puis
      -- validation de la fiche définitive.
      when exists (
        select 1 from public.reading_reports r where r.project_id = p.id
      ) then 'deuxieme_lecture'
      when exists (
        select 1 from public.reading_assignments a
        where a.project_id = p.id and a.status in ('en_cours', 'rendue')
      ) then 'premiere_lecture'
      else 'attribution'
    end,
    p.created_at,
    (
      select max(pub.published_at) from public.reading_report_publications pub
      join public.reading_reports r on r.id = pub.reading_report_id
      where r.project_id = p.id
    )
  from public.projects p
  where p.id = p_project_id
    and (p.owner_id = auth.uid() or public.is_admin());
$$;
