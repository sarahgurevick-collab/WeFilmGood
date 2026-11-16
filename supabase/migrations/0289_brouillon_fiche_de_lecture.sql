-- Un bouton « Enregistrer » sur les fiches de lecture à valider (16/11/2026,
-- Sarah : « tu peux me faire un bouton enregistrer sur les fiches de
-- lectures »). Sarah reprend une fiche en plusieurs fois : ses corrections
-- sont gardées sans être publiées. Le brouillon vit à part : le lecteur ne
-- voit jamais les corrections de l'administration (reading_reports reste sa
-- version), et l'auteur ne voit que ce qui est publié.

create table if not exists public.fiches_brouillons_admin (
  reading_report_id uuid primary key references public.reading_reports(id) on delete cascade,
  content           text not null,
  score             smallint check (score between 0 and 200),
  reader_id         uuid references public.profiles(id),
  enregistre_par    uuid references public.profiles(id),
  enregistre_le     timestamptz not null default now()
);
alter table public.fiches_brouillons_admin enable row level security;
drop policy if exists "administration seulement" on public.fiches_brouillons_admin;
create policy "administration seulement" on public.fiches_brouillons_admin
  for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.fiches_brouillons_admin from anon;
grant select, insert, update, delete on public.fiches_brouillons_admin to authenticated;

notify pgrst, 'reload schema';
