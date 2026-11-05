-- Films français agréés par le CNC, 2001-2025 (05/11/2026, Sarah).
-- Source : « Liste des films agréés » du CNC (open data, data.gouv.fr).
-- Une ligne par film et par année d'agrément. Sert à montrer aux porteurs
-- de projet des « films comparables » (même genre, même tranche de budget)
-- avec leur financement réel et leurs entrées en salles.
-- Les entrées en salles ne viennent pas du CNC mais de la base LUMIERE de
-- l'Observatoire européen de l'audiovisuel : entrees_france reste vide tant
-- qu'aucun film n'a pu être rapproché avec certitude.
-- Administration seulement (rien n'est visible sans passer par le serveur).

create table if not exists public.films_cnc (
  id bigint generated always as identity primary key,
  visa integer not null,
  annee_agrement smallint not null,
  titre text not null,
  titre_normalise text not null,
  realisateur text,
  producteurs_delegues text,
  devis integer,
  genre text check (genre in ('fiction', 'documentaire', 'animation')),
  initiative_francaise boolean,
  rang_realisateur text,
  premier_film boolean,
  bonus_parite boolean not null default false,
  avance_sur_recettes text check (avance_sur_recettes in ('avant', 'apres')),
  chaines_payantes text,
  chaines_clair text,
  sofica boolean not null default false,
  credit_impot boolean not null default false,
  aide_regionale boolean not null default false,
  nationalites jsonb,
  part_francaise smallint,
  brut jsonb not null,
  entrees_france integer,
  annee_sortie smallint,
  source_entrees text,
  lumiere_id text,
  created_at timestamptz not null default now(),
  unique (annee_agrement, visa)
);

comment on table public.films_cnc is
  'Films agréés par le CNC (2001-2025), un par film et année d''agrément ; devis et financement du CNC, entrées de LUMIERE.';
comment on column public.films_cnc.titre_normalise is
  'Titre pour le rapprochement : sans accents, ponctuation ni article du début, article du CNC remis à sa place (« Comte de Monte-Cristo (Le) » = « comte de monte cristo »).';
comment on column public.films_cnc.rang_realisateur is
  'Rang du film pour son réalisateur, tel que le CNC l''écrit (1 = premier film, « 3 / 2 » = deux réalisateurs).';
comment on column public.films_cnc.avance_sur_recettes is
  'Avance sur recettes du CNC : avant ou après réalisation ; vide = pas d''avance.';
comment on column public.films_cnc.nationalites is
  'Pays coproducteurs et leur part en % : [{"pays":"France","part":80},...].';
comment on column public.films_cnc.brut is
  'La ligne d''origine du fichier du CNC, telle quelle (libellés de colonnes en clés).';
comment on column public.films_cnc.source_entrees is
  'D''où viennent les entrées (ex. « LUMIERE, rapprochement par titre et réalisateur »).';

create index if not exists films_cnc_devis_idx on public.films_cnc (devis);
create index if not exists films_cnc_titre_idx on public.films_cnc (titre_normalise);

alter table public.films_cnc enable row level security;
revoke all on public.films_cnc from anon, authenticated;
