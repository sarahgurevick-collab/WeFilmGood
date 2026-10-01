-- Portraits proposés par WeFilmGood (01/10/2026).
--
-- Les personnages repris de WFG 1 sans photo reçoivent un portrait choisi
-- par la plateforme (banque Pixabay, Wikipédia pour les personnes réelles),
-- pour donner envie aux auteurs de revenir voir leur fiche. Ce drapeau
-- distingue ces portraits de ceux que l'auteur a choisis lui-même : il
-- retombe à false dès que l'auteur enregistre un autre portrait, et permet
-- de retirer d'un coup tout ce que la plateforme a posé.
alter table public.characters
  add column if not exists photo_proposee boolean not null default false;

comment on column public.characters.photo_proposee is
  'true : portrait posé par la plateforme, pas choisi par l''auteur.';

notify pgrst, 'reload schema';
