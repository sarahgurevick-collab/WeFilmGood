-- Cadrage de la photo de profil à la main (02/11/2026, Sarah). Jusqu'ici la
-- photo était coupée en carré à l'envoi, là où le programme croyait voir le
-- sujet, et l'original était jeté : pour Sadaf Foroughi, le visage s'est
-- retrouvé poussé à droite et coupé en haut, sans recours. Désormais la
-- photo entière est gardée (avatar_original_path) et le membre fait glisser
-- le cadre, comme pour les portraits des personnages (06/10) ; le carré
-- affiché (avatar_url) est refait à partir de l'original à chaque réglage.
alter table public.profiles add column if not exists avatar_original_path text;
alter table public.profiles add column if not exists photo_x integer not null default 50;
alter table public.profiles add column if not exists photo_y integer not null default 20;

comment on column public.profiles.avatar_original_path is
  'Chemin, dans le seau avatars, de la photo entière déposée par le membre ; nul pour les photos envoyées avant le 02/11/2026 (carré seul conservé).';
comment on column public.profiles.photo_x is
  'Cadrage de la photo : position horizontale visible, en % (0 gauche, 100 droite).';
comment on column public.profiles.photo_y is
  'Cadrage de la photo : position verticale visible, en % (0 haut, 100 bas) ; 20 par défaut, là où se trouve le visage.';

notify pgrst, 'reload schema';
