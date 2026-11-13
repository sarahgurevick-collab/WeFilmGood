-- =====================================================================
-- Le ComedyPitch (13/11/2026, règles et textes validés par Sarah le 12/11).
--
-- Un comédien se filme en jouant un personnage, depuis la carte du
-- personnage sur la fiche projet. Même mécanique que le videopitch de
-- l'auteur (migration 0192) : envoi par morceaux, allégement par le
-- serveur, validation par l'équipe qui dépose la vidéo sur Vimeo et
-- colle le lien. On réutilise donc la table videopitch_depots, avec :
--
--   genre          'videopitch' (l'auteur, sur le projet) ou 'comedypitch'
--   personnage_id  le personnage joué (comedypitch seulement)
--
-- Un ComedyPitch en ligne = un dépôt genre 'comedypitch', état 'valide',
-- avec son numéro Vimeo. Plusieurs comédiens par personnage ; un seul
-- ComedyPitch par comédien et par personnage (le nouveau remplace l'ancien).
--
-- L'étoile filante : le signe d'appréciation, une par personne et par
-- ComedyPitch, compteur sans noms.
-- =====================================================================

alter table public.videopitch_depots
  add column if not exists genre text not null default 'videopitch'
    check (genre in ('videopitch', 'comedypitch')),
  add column if not exists personnage_id uuid references public.characters(id) on delete cascade,
  add column if not exists vu_par_auteur_le timestamptz;

alter table public.videopitch_depots drop constraint if exists videopitch_depots_genre_personnage;
alter table public.videopitch_depots add constraint videopitch_depots_genre_personnage
  check ((genre = 'comedypitch') = (personnage_id is not null));

comment on column public.videopitch_depots.genre is
  'videopitch : la vidéo de l''auteur pour son projet. comedypitch : un comédien joue un personnage (personnage_id).';
comment on column public.videopitch_depots.vu_par_auteur_le is
  'ComedyPitch : quand l''auteur du projet l''a vu (sinon, la fiche le lui annonce).';

create index if not exists videopitch_depots_personnage_idx
  on public.videopitch_depots (personnage_id) where genre = 'comedypitch';

create table if not exists public.comedypitch_etoiles (
  depot_id uuid not null references public.videopitch_depots(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (depot_id, profile_id)
);

comment on table public.comedypitch_etoiles is
  'Étoiles filantes envoyées à un ComedyPitch : une par personne. Lues et écrites par le serveur seulement.';

-- Aucune règle d'accès : seul le serveur (service_role) lit et écrit.
alter table public.comedypitch_etoiles enable row level security;
revoke all on public.comedypitch_etoiles from anon, public, authenticated;
grant all on public.comedypitch_etoiles to service_role;
