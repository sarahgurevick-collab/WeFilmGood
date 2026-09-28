-- Personnages (28/09/2026) : le nom du comédien ou de la comédienne imaginé(e).
-- Sans lui, la photo d'un personnage ne dit pas qui elle montre.
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS actor_name text;
