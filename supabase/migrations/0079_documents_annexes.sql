-- Les documents annexes d'un projet (PDF joints sur WFG 1 : moodboards,
-- dossiers, notes d'intention…) : un nouveau genre de fichier,
-- « document », à côté du scénario, de la vignette et du moodboard.
-- Ils sont rangés dans le bucket privé « scenarios » (mêmes règles
-- d'accès : l'auteur, l'administration, le lecteur assigné). Leur
-- affichage sur la fiche reste à décider (26/09/2026).
alter table public.project_files drop constraint if exists project_files_kind_check;
alter table public.project_files add constraint project_files_kind_check
  check (kind in ('scenario', 'vignette', 'moodboard', 'document'));
