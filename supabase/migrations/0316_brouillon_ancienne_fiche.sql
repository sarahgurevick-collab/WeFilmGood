-- « Enregistrer » sur les anciennes fiches de WFG 1 (Sarah, 23/11/2026) : garde
-- les corrections, la note et le lecteur choisi sans valider la fiche ni la
-- montrer à l'auteur. Même principe que fiches_brouillons_admin (0289).

create table if not exists public.fiches_brouillons_anciennes (
  legacy_review_id integer primary key references public.legacy_reading_reports(legacy_review_id) on delete cascade,
  content          text not null,
  score            smallint check (score between 0 and 200),
  reader_legacy_id integer,
  enregistre_par   uuid references public.profiles(id),
  enregistre_le    timestamptz not null default now()
);
alter table public.fiches_brouillons_anciennes enable row level security;
drop policy if exists "administration seulement" on public.fiches_brouillons_anciennes;
create policy "administration seulement" on public.fiches_brouillons_anciennes
  for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.fiches_brouillons_anciennes from anon;
grant select, insert, update, delete on public.fiches_brouillons_anciennes to authenticated;

notify pgrst, 'reload schema';
