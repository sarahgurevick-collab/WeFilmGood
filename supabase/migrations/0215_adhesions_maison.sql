-- Adhésions à la Maison des Scénaristes avant WFG 2 (30/10/2026, Sarah).
-- Relevées dans la boîte maisondesscenaristes.cm (formulaire « Adhesion
-- MdS », cotisations « Du court au long », PayPal, virements, chèques).
-- Sarah veut convertir ces adhérents sur WFG 2 : l'email de lancement
-- mentionnera leur adhésion et sa date. Une ligne par adhésion (une
-- personne peut avoir adhéré plusieurs années). profile_id = son profil
-- WFG 2 quand il existe. Administration seulement.

create table if not exists public.adhesions_maison (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  email text,
  prenom text,
  nom text,
  annee int,
  date_adhesion date,
  formule text,
  montant numeric(8,2),
  moyen text,
  programme text,
  fil_gmail text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists adhesions_maison_profile on public.adhesions_maison(profile_id);
alter table public.adhesions_maison enable row level security;
revoke all on public.adhesions_maison from anon, authenticated;
