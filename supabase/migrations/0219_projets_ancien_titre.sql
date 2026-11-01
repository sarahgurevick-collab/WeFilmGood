-- Ancien titre d'un projet (01/11/2026, Sarah) : un projet renommé garde
-- son titre d'origine, affiché sous le titre de la fiche et pris en compte
-- par la recherche de l'administration. Exemple : « Mon beau miroir »,
-- d'abord envoyé à la Maison sous le titre « Perfect People ».
alter table public.projects add column if not exists ancien_titre text;
comment on column public.projects.ancien_titre is
  'Titre précédent du projet (renommé depuis), affiché sous le titre de la fiche.';
update public.projects set ancien_titre = 'Perfect People' where id = 'cb230c10-c8fb-44a6-a8db-b1b8eb740a39';
