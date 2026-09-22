-- =====================================================================
-- Les avis WFG rédigés en anglais sur les fiches de lecture héritées.
--
-- La migration 0032 a bien rapatrié les deux colonnes (wfg_review et
-- wfg_review_en), mais la fiche projet n'affiche que wfg_review : 3
-- fiches dont l'avis n'existait qu'en anglais le montraient vide.
-- Comme pour 0060 à 0062, l'anglais rejoint la colonne lue. La colonne
-- wfg_review_en reste en place, pour mémoire.
-- =====================================================================

update public.legacy_reading_reports
set wfg_review = btrim(wfg_review_en)
where btrim(coalesce(wfg_review, '')) = ''
  and btrim(coalesce(wfg_review_en, '')) <> '';
