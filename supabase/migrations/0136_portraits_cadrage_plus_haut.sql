-- Les portraits non cadrés montrent le haut de la photo (06/10/2026, accord
-- de Sarah) : 20 % au lieu de 50 % en vertical, pour ne plus couper les têtes
-- des photos en hauteur. Les photos plus larges que hautes ne bougent pas en
-- vertical : elles ne changent pas. Un portrait déjà cadré à la main (autre
-- chose que 50 / 50) n'est pas touché.
alter table public.characters alter column photo_y set default 20;

update public.characters
   set photo_y = 20
 where photo_x = 50 and photo_y = 50;

comment on column public.characters.photo_y is
  'Cadrage du portrait : position verticale visible, en % (0 haut, 100 bas) ; 20 par défaut, là où se trouve le visage.';

notify pgrst, 'reload schema';
