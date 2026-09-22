-- =====================================================================
-- Les pseudonymes de WFG 1 disparaissent.
--
-- Sur WFG 1, un membre qui remplissait la case « pseudonyme » était
-- affiché sous ce nom partout, pitchothèque comprise. 1 977 l'avaient
-- remplie, dont 1 641 avec autre chose que leur nom — pour l'essentiel
-- des identifiants de forum (Kiuw3, Valerian54, KMonster…).
--
-- Décision de Sarah (22/09/2026) : la bascule vers WFG 2 sert à gommer
-- tout ça. Pas de case pseudonyme, pas de reprise, pas de choix laissé
-- aux membres : chacun apparaît sous son prénom et son nom. Celui qui
-- signe sous un nom de plume l'inscrit comme prénom et nom depuis le
-- bloc « Qui êtes-vous ? » de son profil, qui les demande désormais.
--
-- (Une première version de cette migration avait repris 599
-- pseudonymes dans display_name, le temps d'une heure. Annulée.)
-- =====================================================================

update public.profiles
set display_name = null
where legacy_id is not null
  and display_name is not null;
