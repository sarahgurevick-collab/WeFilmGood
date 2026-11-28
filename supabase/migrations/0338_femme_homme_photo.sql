-- Onglet « Femme / homme » : la photo de l'auteur quand il en a mis une
-- (28/11/2026, Sarah : « cela m'aidera rapidement »).

drop function if exists public.femme_homme_a_trancher();

create or replace function public.femme_homme_a_trancher()
returns table(profile_id uuid, prenom text, nom text, valeur text, source text, wfg1 text, projets text, photo text)
language sql
stable security definer
set search_path = public
as $$
  select p.id, p.first_name, p.last_name, fh.valeur, fh.source,
         case a.gender when '1' then 'femme' when '0' then 'homme' end,
         (select string_agg(x.title, ' · ') from (
            select pr.title from projects pr where pr.owner_id = p.id order by pr.created_at limit 3) x),
         p.avatar_url
  from profils_femme_homme fh
  join profiles p on p.id = fh.profile_id
  left join wfg1.accounts a on a.user_id::text = p.legacy_id::text
  where public.is_admin()
    and fh.source in ('a verifier', 'prenom (avis Claude)', 'prenom (corrige wfg1)', 'Sarah', 'laisse de cote')
    and exists (select 1 from projects pr where pr.owner_id = p.id)
  order by p.last_name, p.first_name;
$$;

revoke all on function public.femme_homme_a_trancher() from public, anon;
grant execute on function public.femme_homme_a_trancher() to authenticated;
