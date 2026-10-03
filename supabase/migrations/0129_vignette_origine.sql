-- Vignette repositionnable (03/10/2026, demande de Sarah) : l'auteur peut
-- faire glisser son image dans le cadre 16/9 pour choisir la partie visible.
-- La vignette affichée partout reste une image 16/9 déjà recadrée ; l'image
-- complète est gardée à part (kind « vignette_origine ») pour pouvoir
-- repositionner plus tard sans rien perdre.
alter table public.project_files drop constraint project_files_kind_check;
alter table public.project_files add constraint project_files_kind_check
  check (kind = any (array['scenario'::text, 'vignette'::text, 'vignette_origine'::text, 'moodboard'::text, 'document'::text]));
