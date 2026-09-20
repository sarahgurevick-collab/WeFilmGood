-- =====================================================================
-- Le portrait chinois de WFG 1.
--
-- 2 000 personnes ont répondu aux vingt questions « si j'étais… », et
-- plus de la moitié d'entre elles y ont répondu en entier — 34 375
-- réponses au total. L'idée de rapprocher les talents entre eux n'est
-- jamais allée au bout sur l'ancienne plateforme ; la matière, elle,
-- était bien là.
--
-- 1 170 de ces personnes ont un profil dans WFG 2 : les autres comptes
-- n'ont pas été repris.
--
-- Les listes de réponses ont changé entre les deux plateformes : un film
-- ou une série proposés autrefois ne le sont plus. Plutôt que de perdre
-- ces réponses, on les conserve telles quelles, préfixées « autre: ».
-- Deux personnes ayant répondu la même chose se rapprochent, que
-- l'option figure ou non dans la liste d'aujourd'hui.
-- =====================================================================

create extension if not exists unaccent;

-- Les libellés diffèrent par des détails de forme : « du Rock » contre
-- « Rock », « Piano/ Synthétiseur » contre « Piano / Synthétiseur ».
create or replace function public.normaliser_reponse(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(lower(unaccent(coalesce(t,''))), '^(du |de la |de l''|des |un |une |le |la |les |l'')', ''),
             '\s*/\s*', ' / ', 'g'),
           '\s+', ' ', 'g');
$$;

-- L'import lui-même a été joué depuis le dump de l'ancienne plateforme,
-- via une table de travail. Correspondance des questions, pour mémoire :
--   q_cinema → cinema            q_movie → film_nationalite
--   q_prefered → film_prefere    q_tv_show → serie
--   q_char → personnage_film     q_prod → producteur
--   q_drama → piece_theatre      q_music → musique
--   q_instrument → instrument    q_painter → peintre
--   q_event → evenement_historique  q_city → ville
--   q_sport → sport              q_sense → sens
--   q_liquor → alcool            q_meal → plat
--   q_ideal_host → diner_ideal   q_book → livre
--   q_actor → acteur             q_actress → actrice
