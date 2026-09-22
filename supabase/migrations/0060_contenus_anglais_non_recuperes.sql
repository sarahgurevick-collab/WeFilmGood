-- =====================================================================
-- Les fiches remplies en anglais sur WFG 1 étaient arrivées vides.
--
-- L'import initial (avant ce dépôt) n'a repris que les colonnes
-- françaises de wfg1.projects (title, logline, misc). Les 349 projets
-- marqués « language = en » avaient rempli les colonnes _en à la place :
-- leur fiche WFG 2 s'affichait vide, ou avec le placeholder
-- « (sans titre) » posé quand le titre manquait.
--
-- Décision de Sarah (22/09/2026) : la plateforme sera traduite
-- automatiquement, donc un texte saisi en anglais compte comme un texte
-- français — on le rapatrie tel quel dans la même colonne plutôt que de
-- garder deux colonnes par langue. Champs concernés : titre, tagline
-- (logline), logline (misc). 246 fiches touchées.
-- =====================================================================

update public.projects p
set title = btrim(w.title_en)
from wfg1.projects w
where w.project_id::text = p.legacy_id
  and (btrim(coalesce(p.title, '')) = '' or p.title = '(sans titre)')
  and btrim(coalesce(w.title_en, '')) <> '';

update public.projects p
set logline = btrim(w.logline_en)
from wfg1.projects w
where w.project_id::text = p.legacy_id
  and btrim(coalesce(p.logline, '')) = ''
  and btrim(coalesce(w.logline_en, '')) <> '';

update public.projects p
set synopsis = btrim(w.misc_en)
from wfg1.projects w
where w.project_id::text = p.legacy_id
  and btrim(coalesce(p.synopsis, '')) = ''
  and btrim(coalesce(w.misc_en, '')) <> '';
