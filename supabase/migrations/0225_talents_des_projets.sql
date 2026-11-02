-- Les auteurs et l'équipe des projets trouvés par le sens sortent aussi
-- dans les talents (02/11/2026, Sarah : « faire sortir le plus de projets
-- possible »). « Moulin Rouge » trouvait « Le cheval rouge » par le sens,
-- mais pas sa porteuse : la recherche de talents ne suivait que les projets
-- trouvés par les lettres. Le site donne ici les projets trouvés par le sens,
-- la fonction rend leurs talents avec les mêmes exclusions que
-- rechercher_talents (lecteurs, partis, anonymes, cinéphiles, sans nom).
create or replace function public.talents_des_projets(p_projets uuid[])
returns table(id uuid, score real, total bigint, metiers text[])
language sql
stable
security definer
set search_path = public, extensions
as $$
  with projets as (select unnest(p_projets) as id),
  tous as (
    select p.owner_id as id from projets pj join public.projects p on p.id = pj.id
    union
    select ca.profile_id from projets pj join public.project_co_authors ca on ca.project_id = pj.id
    where ca.status = 'accepte' and ca.profile_id is not null
  )
  select c.id, c.score, c.total,
         array(select r.label_fr
               from unnest(public.metiers_du_membre(c.id)) with ordinality m(slug, rang)
               join public.roles r on r.slug = m.slug
               order by m.rang)
  from (
    select p.id, 0.30::real as score, count(*) over () as total,
           row_number() over (order by (p.avatar_url is not null) desc, p.full_name) as rang
    from tous t
    join public.profiles p on p.id = t.id
    where auth.uid() is not null
      and p.anonymized_at is null
      and p.departed_at is null
      and coalesce(btrim(p.full_name), btrim(p.display_name), '') <> ''
      and not exists (select 1 from public.profile_roles l where l.profile_id = p.id and l.role_slug = 'lecteur')
      and not exists (select 1 from wfg1.accounts a where a.user_id::text = p.legacy_id and a.role = 'reader')
      and coalesce(p.category::text, '') <> 'cinephile'
  ) c
  order by c.rang;
$$;

revoke all on function public.talents_des_projets(uuid[]) from public, anon;
grant execute on function public.talents_des_projets(uuid[]) to authenticated, service_role;
