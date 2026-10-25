-- Onglet « Auteurs sélectionnés sans profil », suite (25/10/2026, Sarah).
--
-- 1. Les adresses que Sarah retrouve (liste collée dans la conversation)
--    préremplissent la case « Adresse email » : rangées ici, jamais dans le
--    code (le dépôt GitHub est public). Clé = nom tel qu'écrit dans les
--    sélections, en minuscules sans accents, mots triés.
create table if not exists public.adresses_auteurs_selectionnes (
  cle text primary key,
  email text not null,
  ajoute_le timestamptz not null default now()
);
alter table public.adresses_auteurs_selectionnes enable row level security;
drop policy if exists "administration seule" on public.adresses_auteurs_selectionnes;
create policy "administration seule" on public.adresses_auteurs_selectionnes
  for all using (public.is_admin()) with check (public.is_admin());

-- 2. Les profils déjà créés depuis l'onglet restent dans la liste (« Profil
--    créé » + photo), pour poser la photo sans « prendre la place ».
create or replace function public.profils_auteurs_selectionnes()
returns table (id uuid, full_name text, first_name text, last_name text, avatar_url text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, p.full_name, p.first_name, p.last_name, p.avatar_url
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.raw_user_meta_data->>'imported_from' = 'selection_mds'
    and public.is_admin();
$$;
revoke all on function public.profils_auteurs_selectionnes() from public, anon;
grant execute on function public.profils_auteurs_selectionnes() to authenticated, service_role;
