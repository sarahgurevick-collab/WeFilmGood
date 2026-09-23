-- =====================================================================
-- Le prénom derrière un lien de connexion encore valable.
--
-- La page d'arrivée du lien (/auth/confirm) dit « Bonjour Sarah ! »
-- avant le clic : la personne voit tout de suite que c'est bien son
-- compte. Seul qui tient le lien connaît son empreinte (56 caractères
-- aléatoires) : rien n'est devinable. Un lien déjà servi n'est plus
-- dans auth.one_time_tokens et ne renvoie rien.
-- =====================================================================

create or replace function public.prenom_du_lien(p_token_hash text)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  -- Faute de prénom, le premier mot du nom complet, puis le nom affiché.
  select coalesce(
    nullif(trim(p.first_name), ''),
    nullif(split_part(trim(p.full_name), ' ', 1), ''),
    nullif(trim(p.display_name), '')
  )
  from auth.one_time_tokens o
  join public.profiles p on p.id = o.user_id
  where o.token_hash = p_token_hash
  limit 1;
$$;

revoke all on function public.prenom_du_lien(text) from public;
grant execute on function public.prenom_du_lien(text) to anon, authenticated;
