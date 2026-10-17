-- Seconde passe des portraits (17/10/2026, Sarah : « D'accord pour les 2600
-- personnages avec Openverse en seconde source »). Les personnages restés
-- « rien » au premier tour (Pixabay seul, recherches précises) repassent avec
-- une recherche plus simple et une seconde banque, Openverse (photos du
-- domaine public et CC0 seulement : aucune mention d'auteur à afficher).
-- `passe` dit à quel tour la ligne a été écrite : un personnage n'est repris
-- qu'une fois par la seconde passe.
alter table public.portraits_suivi add column if not exists passe smallint not null default 1;
