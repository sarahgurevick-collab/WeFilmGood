-- =====================================================================
-- CinéMatch : les réponses données ne se changent plus (20/10/2026, Sarah).
--
-- Qui change ses réponses pour gonfler son match, ou « pour voir », fausse
-- le jeu. Une fois enregistrée, une réponse est donc verrouillée : on peut
-- seulement répondre aux questions restées vides. L'administration peut
-- déverrouiller un membre (écran des membres) : sa prochaine
-- sauvegarde peut alors tout modifier, puis le verrou se remet.
-- =====================================================================

alter table public.profiles
  add column if not exists personality_unlocked_at timestamptz;

comment on column public.profiles.personality_unlocked_at is
  'Posée par l''administration : la prochaine sauvegarde des réponses CinéMatch peut modifier celles déjà données, puis la colonne est vidée.';
