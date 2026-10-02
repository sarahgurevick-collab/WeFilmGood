-- La Galaxie de Talents sans mot cherché (02/10/2026) : quand le champ de
-- recherche est vide et qu'on choisit « Talents », la Carte des étoiles
-- affiche les talents au lieu des projets. Exactement les règles de la
-- recherche de talents : membre connecté, jamais les lecteurs, ni les
-- comptes partis ou anonymisés, ni ceux sans nom. Ceux qui ont une photo
-- d'abord ; à l'intérieur, un tirage au sort qui change chaque nuit.
create or replace function public.galaxie_talents(p_limite integer default 60, p_decalage integer default 0)
returns table(id uuid, total bigint, metiers text[])
language sql
stable security definer
set search_path to 'public'
as $$
  select c.id, c.total,
         array(select r.label_fr
               from unnest(public.metiers_du_membre(c.id)) with ordinality m(slug, rang)
               join public.roles r on r.slug = m.slug
               order by m.rang)
  from (
    select p.id, count(*) over () as total,
           row_number() over (order by (p.avatar_url is not null) desc, md5(p.id::text || current_date::text)) as rang
    from public.profiles p
    where auth.uid() is not null
      and p.anonymized_at is null
      and p.departed_at is null
      and coalesce(btrim(p.full_name), btrim(p.display_name), '') <> ''
      and not exists (select 1 from public.profile_roles l where l.profile_id = p.id and l.role_slug = 'lecteur')
      and not exists (select 1 from wfg1.accounts a where a.user_id::text = p.legacy_id and a.role = 'reader')
    order by (p.avatar_url is not null) desc, md5(p.id::text || current_date::text)
    limit greatest(p_limite, 0) offset greatest(p_decalage, 0)
  ) c
  order by c.rang;
$$;

revoke all on function public.galaxie_talents(integer, integer) from public, anon;
grant execute on function public.galaxie_talents(integer, integer) to authenticated;
