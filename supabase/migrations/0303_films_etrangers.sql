-- Films étrangers dans la base des films (demande de Sarah, 21/11/2026) :
-- ils viennent de TMDB (source 'tmdb'), avec leur pays de production
-- (codes ISO : US, GB… ; le nom français est écrit à l'affichage).
-- Les lignes elles-mêmes sont posées par script, depuis le fichier
-- ~/imports/tmdb-films-etrangers-2026-11-21.json (scripts/recuperer-films-etrangers-tmdb.mjs).
alter table public.films_cnc add column if not exists pays text;
create unique index if not exists films_cnc_tmdb_etranger on public.films_cnc (tmdb_id) where source = 'tmdb';
