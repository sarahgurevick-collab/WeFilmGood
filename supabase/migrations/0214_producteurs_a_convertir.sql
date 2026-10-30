-- Producteurs à convertir au lancement de WFG 2 (30/10/2026, Sarah).
-- Des sociétés de production (et quelques distributeurs) ont écrit à la
-- Maison des Scénaristes sans envoyer de projet : AUCUN profil n'est créé
-- pour eux (prudence). Leurs informations, tirées des emails, sont gardées
-- ici pour les contacter au lancement. Quand l'un d'eux s'inscrit, son
-- profil est noté dans profile_id. Administration seulement.

create table if not exists public.producteurs_a_convertir (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  autres_adresses text[] not null default '{}',
  prenom text,
  nom text,
  societe text,
  fonction text,
  telephone text,
  site text,
  ville_pays text,
  type text,
  premier_contact date,
  dernier_contact date,
  objet text,
  projets_cites text[] not null default '{}',
  interet text,
  a_verifier text,
  fils_gmail text[] not null default '{}',
  source text not null default 'boites_mds',
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.producteurs_a_convertir enable row level security;
revoke all on public.producteurs_a_convertir from anon, authenticated;
