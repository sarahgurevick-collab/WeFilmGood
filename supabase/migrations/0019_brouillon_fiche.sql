-- =====================================================================
-- Brouillon d'une fiche de lecture.
--
-- Les lecteurs rédigent sous Word depuis dix ans par peur de tout perdre
-- si la plateforme lâche en cours de route. Le brouillon est conservé au
-- fil de la frappe, ce qui retire cette raison — sans les empêcher de
-- garder leurs habitudes.
--
-- Il vit sur l'attribution plutôt que dans une table à part : la fiche
-- n'existe pas encore à ce stade, et les règles d'accès de
-- reading_assignments conviennent déjà (le lecteur concerné, et lui seul).
-- =====================================================================

alter table public.reading_assignments add column if not exists draft_content text;
alter table public.reading_assignments add column if not exists draft_saved_at timestamptz;
