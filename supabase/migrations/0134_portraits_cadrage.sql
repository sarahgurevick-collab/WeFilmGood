-- Le cadrage d'un portrait de personnage (06/10/2026, demande de Sarah).
-- La photo est toujours stockée entière ; ces deux nombres disent seulement
-- quelle partie on en montre dans le cadre (en %, 50 / 50 = le centre), comme
-- vignette_x / vignette_y pour l'image de présentation d'un projet.
-- Aucune photo n'est modifiée : on peut recadrer autant qu'on veut.
alter table public.characters
  add column if not exists photo_x smallint not null default 50
    check (photo_x between 0 and 100),
  add column if not exists photo_y smallint not null default 50
    check (photo_y between 0 and 100);

comment on column public.characters.photo_x is
  'Cadrage du portrait : position horizontale visible, en % (0 gauche, 100 droite).';
comment on column public.characters.photo_y is
  'Cadrage du portrait : position verticale visible, en % (0 haut, 100 bas).';

notify pgrst, 'reload schema';
