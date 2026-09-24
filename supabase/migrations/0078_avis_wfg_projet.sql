-- =====================================================================
-- L'« Avis WeFilmGood » d'un projet labellisé, visible sur sa fiche.
--
-- Demandé par Sarah le 24/09/2026 : sous le cadre de la fiche projet, la
-- petite phrase d'encouragement que les lecteurs écrivent quand le projet
-- est labellisé ; rien s'il n'y en a pas.
--
-- Les fiches de lecture restent confidentielles : cette fonction ne rend
-- QUE cette phrase, et seulement pour un projet labellisé, à partir d'une
-- fiche vérifiée (statut 2). La plus récente si plusieurs.
-- =====================================================================

create or replace function public.avis_wfg_projet(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select btrim(l.wfg_review)
  from public.legacy_reading_reports l
  join public.projects p on p.id = l.project_id
  where l.project_id = p_project_id
    and p.status = 'labellise'
    and l.statut = 2
    and coalesce(btrim(l.wfg_review), '') <> ''
  order by l.read_at desc nulls last
  limit 1;
$$;

revoke all on function public.avis_wfg_projet(uuid) from public;
grant execute on function public.avis_wfg_projet(uuid) to authenticated;
