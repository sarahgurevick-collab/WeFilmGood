-- Téléchargements de la sauvegarde complète par l'administration (18/10/2026,
-- Sarah : copie hebdomadaire sur son disque de 2 To, en attendant une
-- sauvegarde payante hors du serveur). Sert à afficher « dernier
-- téléchargement » dans /admin/exports.
create table if not exists public.telechargements_sauvegarde (
  id bigint generated always as identity primary key,
  sauvegarde text not null,
  par uuid,
  le timestamptz not null default now()
);
alter table public.telechargements_sauvegarde enable row level security;
revoke all on public.telechargements_sauvegarde from anon, authenticated;
