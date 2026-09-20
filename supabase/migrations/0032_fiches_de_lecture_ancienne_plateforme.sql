-- =====================================================================
-- Les fiches de lecture de l'ancienne plateforme : la mémoire du travail
-- fait sur chaque projet depuis 2017.
--
-- Elles n'ont pas leur place dans `reading_reports`, qui décrit le
-- circuit de lecture de WFG 2 (une fiche y découle d'une mission
-- attribuée à un lecteur inscrit). Ici il n'y a ni mission ni compte
-- lecteur : seulement le texte, la note et la date, tels qu'ils ont été
-- écrits. D'où une table dédiée, sur le modèle de `legacy_profiles`.
--
-- Un même projet peut en porter plusieurs : certains ont été redéposés
-- d'une année sur l'autre, jusqu'à 9 fiches pour un seul projet.
--
-- Confidentialité : sur l'ancienne plateforme ces fiches n'étaient pas
-- publiques (5 794 sur 5 796 avec `display = 0`), mais les auteurs les
-- lisaient — 2 641 les ont notées en retour. On reprend exactement cette
-- règle : l'auteur du projet et les administrateurs, personne d'autre.
-- =====================================================================

create table if not exists public.legacy_reading_reports (
  legacy_review_id  integer primary key,
  project_id        uuid not null references public.projects(id) on delete cascade,
  content           text,
  final_mark        smallint,
  marks             text,
  wfg_review        text,
  wfg_review_en     text,
  author_rating     smallint,
  reader_legacy_id  integer,
  read_at           timestamptz,
  imported_at       timestamptz not null default now()
);

create index if not exists legacy_reading_reports_project_idx
  on public.legacy_reading_reports (project_id, read_at desc);

alter table public.legacy_reading_reports enable row level security;

drop policy if exists "fiches héritées réservées à l'auteur et à l'admin"
  on public.legacy_reading_reports;

create policy "fiches héritées réservées à l'auteur et à l'admin"
  on public.legacy_reading_reports for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );
