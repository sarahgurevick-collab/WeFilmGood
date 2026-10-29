-- Onglet « Auteurs sélectionnés » : le site internet pro de chaque profil
-- créé, pour le modifier depuis l'onglet (29/10, Sarah).
drop function if exists public.profils_auteurs_selectionnes();
create function public.profils_auteurs_selectionnes()
returns table (id uuid, full_name text, first_name text, last_name text, avatar_url text, website text)
language sql stable security definer set search_path = public, auth as $$
  select p.id, p.full_name, p.first_name, p.last_name, p.avatar_url, p.website
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.raw_user_meta_data->>'imported_from' = 'selection_mds'
    and public.is_admin();
$$;
revoke all on function public.profils_auteurs_selectionnes() from public, anon;
grant execute on function public.profils_auteurs_selectionnes() to authenticated, service_role;
