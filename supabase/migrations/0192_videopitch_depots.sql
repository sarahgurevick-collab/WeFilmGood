-- =====================================================================
-- Dépôt des videopitchs par les auteurs (22/10/2026, décision de Sarah).
--
-- Sur WFG 1, les vidéos arrivaient par WeTransfer ou Grosfichiers et
-- Sarah passait des heures à les compresser. Sur WFG 2 :
--
--   1. l'auteur envoie sa vidéo telle quelle depuis le bloc Documents
--      de sa fiche (par morceaux, jusqu'à 2 Go) ;
--   2. le serveur l'allège tout seul en 720p (ffmpeg), sous 100 Mo ;
--   3. elle attend dans l'admin, rubrique « Videopitchs » : Sarah la
--      regarde, la dépose sur Vimeo et colle le lien (→ project_videopitchs),
--      ou la refuse avec un motif ;
--   4. l'auteur est prévenu par e-mail à chaque étape.
--
-- L'API Vimeo n'est pas branchée : l'accès à l'envoi par l'API est
-- réservé à la formule Advanced (47 €/mois), jugée trop chère pour ça.
--
-- Les fichiers vivent hors de la base, sur le disque du serveur
-- (/home/wfg/videopitchs/<id>/), jamais dans le stockage Supabase (limite
-- 50 Mo). L'original est effacé dès que la version allégée est prête ;
-- la version allégée, dès que le videopitch est validé ou refusé.
--
-- États : envoi → recu → preparation → a_valider → valide | refuse
--                                   ↘ echec (vidéo illisible)
-- =====================================================================

create table if not exists public.videopitch_depots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  deposant_id uuid not null references public.profiles(id) on delete cascade,
  langue text not null default 'fr' check (langue in ('fr', 'en')),
  etat text not null default 'envoi'
    check (etat in ('envoi', 'recu', 'preparation', 'a_valider', 'valide', 'refuse', 'echec')),
  nom_origine text,
  type_origine text,
  taille_annoncee bigint not null default 0,
  taille_recue bigint not null default 0,
  taille_allegee bigint,
  duree_secondes integer,
  erreur text,
  motif_refus text,
  vimeo_id text,
  cree_le timestamptz not null default now(),
  recu_le timestamptz,
  prepare_le timestamptz,
  traite_le timestamptz,
  traite_par uuid references public.profiles(id) on delete set null
);

comment on table public.videopitch_depots is
  'Videopitchs envoyés par les auteurs, allégés par le serveur, en attente de validation par l''équipe.';
comment on column public.videopitch_depots.etat is
  'envoi (morceaux en cours) → recu → preparation (ffmpeg) → a_valider → valide / refuse ; echec si la vidéo est illisible.';

create index if not exists videopitch_depots_project_idx on public.videopitch_depots (project_id);
create index if not exists videopitch_depots_etat_idx on public.videopitch_depots (etat);

alter table public.videopitch_depots enable row level security;

-- L'auteur voit ses dépôts (et l'administration tout). Toute écriture passe
-- par le serveur (service_role) : personne ne change un état depuis le navigateur.
drop policy if exists "videopitch_depots : auteur et admin lisent" on public.videopitch_depots;
create policy "videopitch_depots : auteur et admin lisent" on public.videopitch_depots
  for select using (
    deposant_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

revoke all on public.videopitch_depots from anon, public;
grant select on public.videopitch_depots to authenticated;
grant all on public.videopitch_depots to service_role;
