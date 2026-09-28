-- Parcours (28/09/2026) : une case « Un autre métier… » / « Un autre genre… »
-- avec champ libre facultatif, et des réponses Oui/Non pour l'agent et les
-- réseaux, afin que chacun puisse atteindre 100 %.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS autre_metier_actif boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autre_metier text,
  ADD COLUMN IF NOT EXISTS autre_genre_actif boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autre_genre text,
  ADD COLUMN IF NOT EXISTS agent_reponse boolean,
  ADD COLUMN IF NOT EXISTS reseaux_reponse boolean;

-- Ceux qui ont déjà rempli l'un ou l'autre ont de fait répondu « Oui ».
UPDATE public.profiles SET agent_reponse = true
  WHERE agent_reponse IS NULL AND agent_name IS NOT NULL AND btrim(agent_name) <> '';
UPDATE public.profiles p SET reseaux_reponse = true
  WHERE reseaux_reponse IS NULL
    AND EXISTS (SELECT 1 FROM public.profile_social_links l WHERE l.profile_id = p.id);
