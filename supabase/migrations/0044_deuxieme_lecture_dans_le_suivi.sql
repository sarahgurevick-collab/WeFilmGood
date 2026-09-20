-- =====================================================================
-- Un projet est relu avant que sa fiche soit arrêtée.
--
-- Le suivi montré à l'auteur s'arrêtait à la première lecture. Or cette
-- phase de relecture prend du temps, et son silence est précisément ce
-- qui pousse un auteur à écrire pour demander où en est son projet.
--
-- « Relecture » et non « deuxième lecture » : le relecteur est tantôt un
-- second lecteur professionnel, tantôt la Maison elle-même, qui s'en
-- charge bénévolement. Le libellé doit rester vrai dans les deux cas, et
-- l'organisation interne ne regarde pas l'auteur.
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
      ) then 'relecture'
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
