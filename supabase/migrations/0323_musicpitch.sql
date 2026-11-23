-- =====================================================================
-- Le MusicPitch (23/11/2026, demandé par Sarah : « le dépôt d'un fichier
-- son pour un musicPitch »).
--
-- Un compositeur dépose un fichier son (thème ou chanson) pour un projet.
-- Même mécanique que le ComedyPitch (0261) : envoi par morceaux, puis
-- validation par l'équipe. On réutilise videopitch_depots, avec le genre
-- 'musicpitch', rattaché au projet (pas à un personnage).
--
-- Deux différences avec la vidéo :
--   - le serveur convertit le son en MP3 (pas de Vimeo) ;
--   - à la validation, le MP3 est rangé dans le stockage du site (dossier
--     privé « musicpitchs », sauvegardé chaque nuit avec le reste), sous
--     le nom <id du dépôt>.mp3. Le site ne le fait écouter que par des
--     liens temporaires, à ceux qui ont le droit de voir la fiche.
--
-- Les étoiles : la table comedypitch_etoiles sert aussi aux MusicPitchs.
-- =====================================================================

alter table public.videopitch_depots drop constraint if exists videopitch_depots_genre_check;
alter table public.videopitch_depots add constraint videopitch_depots_genre_check
  check (genre in ('videopitch', 'comedypitch', 'musicpitch'));

comment on column public.videopitch_depots.genre is
  'videopitch : la vidéo de l''auteur pour son projet. comedypitch : un comédien joue un personnage (personnage_id). musicpitch : un compositeur dépose un son pour le projet.';
comment on column public.videopitch_depots.vu_par_auteur_le is
  'ComedyPitch et MusicPitch : quand l''auteur du projet l''a vu (sinon, la fiche le lui annonce).';

create index if not exists videopitch_depots_musicpitch_idx
  on public.videopitch_depots (project_id) where genre = 'musicpitch';

-- Dossier privé, sans aucune règle d'accès : seul le serveur y lit et y écrit.
insert into storage.buckets (id, name, public)
values ('musicpitchs', 'musicpitchs', false)
on conflict (id) do nothing;
