-- La fiche personnage en parties (07/10/2026, proposition validée par Sarah) :
-- âge par tranche de dix ans, époque, physique, détail caractéristique, allure.
-- Tout est facultatif : les personnages existants restent tels quels.
alter table public.characters
  add column if not exists age_tranche text,
  add column if not exists epoque text,
  add column if not exists taille text,
  add column if not exists corpulence text,
  add column if not exists cheveux_couleur text,
  add column if not exists cheveux_coupe text,
  add column if not exists yeux text,
  add column if not exists signes text[] not null default '{}',
  add column if not exists origine text,
  add column if not exists detail_caracteristique text,
  add column if not exists allure text;

notify pgrst, 'reload schema';
