-- Mémo de l'administration sur un projet en attente (17/11/2026, Sarah :
-- « l'auteur doit m'envoyer une nouvelle version, ne pas attribuer »).
-- Table à part, pas une colonne de projects : projects est lisible des
-- auteurs et des membres, ce mémo ne doit l'être de personne d'autre que
-- l'administration.
create table if not exists public.projet_memos_admin (
  project_id uuid primary key references public.projects(id) on delete cascade,
  memo text not null,
  updated_at timestamptz not null default now()
);

alter table public.projet_memos_admin enable row level security;

create policy "memo_admin_tout" on public.projet_memos_admin
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.projet_memos_admin from anon;
