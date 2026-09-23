-- =====================================================================
-- Le lien de connexion est-il encore valable, et pour qui ?
--
-- Remplace prenom_du_lien (0073), qui ne distinguait pas un lien périmé
-- d'un compte sans prénom. Un lien n'est plus dans auth.one_time_tokens
-- s'il a servi, ou si un lien plus récent a été demandé depuis : la page
-- d'arrivée le dit alors tout de suite, au lieu de proposer un bouton qui
-- échouerait. `prenom` peut être vide pour un lien valable.
-- =====================================================================

drop function if exists public.prenom_du_lien(text);

create or replace function public.lien_de_connexion(p_token_hash text)
returns table (valable boolean, prenom text)
language sql
stable
security definer
set search_path to ''
as $$
  select
    exists (select 1 from auth.one_time_tokens o where o.token_hash = p_token_hash),
    (
      -- Faute de prénom, le premier mot du nom complet, puis le nom affiché.
      select coalesce(
        nullif(trim(p.first_name), ''),
        nullif(split_part(trim(p.full_name), ' ', 1), ''),
        nullif(trim(p.display_name), '')
      )
      from auth.one_time_tokens o
      join public.profiles p on p.id = o.user_id
      where o.token_hash = p_token_hash
      limit 1
    );
$$;

revoke all on function public.lien_de_connexion(text) from public;
grant execute on function public.lien_de_connexion(text) to anon, authenticated;
