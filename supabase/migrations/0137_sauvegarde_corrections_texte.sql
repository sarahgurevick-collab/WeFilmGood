-- Les accents perdus de l'ancienne plateforme (« Infirmie?re » pour
-- « Infirmière ») : avant de corriger un texte, on garde l'ancien ici, pour
-- pouvoir revenir en arrière (06/10/2026, demande de Sarah).
create table if not exists public.corrections_texte_sauvegarde (
  id         bigserial primary key,
  table_name text not null,
  ligne_id   text not null,
  colonne    text not null,
  ancien     text not null,
  nouveau    text not null,
  corrige_le timestamptz not null default now()
);

create index if not exists corrections_texte_ligne_idx
  on public.corrections_texte_sauvegarde (table_name, ligne_id);

-- Réservé au serveur : aucune règle d'accès.
alter table public.corrections_texte_sauvegarde enable row level security;

notify pgrst, 'reload schema';
