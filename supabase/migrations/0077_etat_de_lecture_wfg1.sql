-- =====================================================================
-- « Où en est votre projet » tient compte de WFG 1.
--
-- Jusqu'ici, le cadre ne voyait que les lectures faites sur WFG 2 : un
-- projet repris, déjà lu et même labellisé sur WFG 1, s'affichait
-- « Projet reçu » à la date de l'import (19/09/2026). Constaté par Sarah
-- le 24/09 sur « Un soir, un matin ».
--
-- Pour un projet repris de WFG 1 (legacy_id), sans lecture sur WFG 2 :
--  - fiche héritée vérifiée (statut 2)          → « Analyse disponible »
--  - fiche héritée rendue, à valider (statut 1) → « Relecture et validation »
--  - fiche attribuée non écrite (statut 0), ou
--    projet en lecture sur WFG 1 (status 1)     → « Lecture en cours »
--  - sinon (jamais envoyé en lecture)           → pas de cadre
-- La date de dépôt est celle de WFG 1, pas celle de l'import.
-- Affichage seulement : aucune donnée n'est modifiée.
-- =====================================================================

create or replace function public.etat_de_lecture(p_project_id uuid)
returns table (etat text, depose_le timestamptz, rendue_le timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  with p as (
    select pr.*
    from public.projects pr
    where pr.id = p_project_id
      and (pr.owner_id = auth.uid() or public.is_admin())
  ),
  wfg2 as (
    select
      exists (
        select 1 from public.reading_report_publications pub
        join public.reading_reports r on r.id = pub.reading_report_id
        where r.project_id = p_project_id
      ) as publiee,
      exists (select 1 from public.reading_reports r where r.project_id = p_project_id) as rendue,
      exists (
        select 1 from public.reading_assignments a
        where a.project_id = p_project_id and a.status in ('en_cours', 'rendue')
      ) as en_lecture,
      (
        select max(pub.published_at) from public.reading_report_publications pub
        join public.reading_reports r on r.id = pub.reading_report_id
        where r.project_id = p_project_id
      ) as publiee_le
  ),
  wfg1 as (
    select
      bool_or(l.statut = 2) as verifiee,
      bool_or(l.statut = 1) as a_valider,
      bool_or(l.statut = 0) as attribuee,
      max(l.read_at) filter (where l.statut = 2) as lue_le,
      (
        select w.status from wfg1.projects w
        where w.project_id::text = (select legacy_id::text from p)
        limit 1
      ) as statut_projet,
      (
        select nullif(w.date, '')::timestamptz from wfg1.projects w
        where w.project_id::text = (select legacy_id::text from p)
        limit 1
      ) as depose_wfg1
    from public.legacy_reading_reports l
    where l.project_id = p_project_id
  ),
  calcul as (
    select
      case
        when wfg2.publiee then 'disponible'
        when wfg2.rendue then 'relecture'
        when wfg2.en_lecture then 'premiere_lecture'
        when p.legacy_id is null then 'attribution'
        when coalesce(wfg1.verifiee, false) then 'disponible'
        when coalesce(wfg1.a_valider, false) then 'relecture'
        when coalesce(wfg1.attribuee, false) or wfg1.statut_projet::text = '1' then 'premiere_lecture'
        else null
      end as etat,
      case
        when p.legacy_id is not null then coalesce(wfg1.depose_wfg1, p.created_at)
        else p.created_at
      end as depose_le,
      coalesce(wfg2.publiee_le, wfg1.lue_le) as rendue_le
    from p, wfg2, wfg1
  )
  select etat, depose_le, rendue_le from calcul where etat is not null;
$$;
