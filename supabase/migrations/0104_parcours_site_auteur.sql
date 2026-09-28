-- Parcours (28/09/2026) : « Avez-vous un site internet ? » pour les auteurs.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS site_reponse boolean;
UPDATE public.profiles SET site_reponse = true
  WHERE site_reponse IS NULL AND category = 'auteur' AND website IS NOT NULL AND btrim(website) <> '';
