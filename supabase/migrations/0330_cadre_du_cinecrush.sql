-- Le cadre de la carte du CinéCrush dans les Galaxies (24/11/2026, Sarah) :
-- choisi à la programmation, selon le projet. « cinema » = le fronton
-- d'ampoules ; « tableau » = bord blanc et droit, pour un drame ;
-- « fleuri » = bord de fleurs, pour une dramédie amoureuse.
alter table public.cinecrush
  add column if not exists cadre text not null default 'cinema'
  check (cadre in ('cinema', 'tableau', 'fleuri'));

notify pgrst, 'reload schema';
