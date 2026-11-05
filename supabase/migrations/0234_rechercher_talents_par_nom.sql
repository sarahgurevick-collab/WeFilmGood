-- 05/11/2026, Sarah : « sadaf » ne trouvait pas Sadaf Foroughi. La grande
-- recherche des talents (noms, biographies, métiers, mots-clés, projets)
-- dépassait les 8 secondes permises quand plusieurs recherches tournaient
-- en même temps ; le site n'affichait alors que les talents rapprochés par
-- le sens. Cette recherche-ci, par le nom seulement, prend le relais en
-- moins d'une seconde, avec les mêmes exclusions.
create or replace function public.rechercher_talents_par_nom(q text, p_limite integer default 1000)
returns table(id uuid, score real, total bigint, metiers text[])
language sql stable security definer
set search_path to 'public', 'extensions'
as $$
  with terme as (
    select nullif(btrim(public.sans_accent(q)), '') as mot,
           '%' || replace(replace(replace(btrim(public.sans_accent(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  )
  select c.id, c.score, c.total,
         array(select r.label_fr
               from unnest(public.metiers_du_membre(c.id)) with ordinality m(slug, rang)
               join public.roles r on r.slug = m.slug
               order by m.rang)
  from (
    select p.id,
           (case when lower(public.sans_accent(coalesce(p.full_name, ''))) = lower(t.mot) then 0.95 else 0.85 end)::real as score,
           count(*) over () as total,
           row_number() over (order by (lower(public.sans_accent(coalesce(p.full_name, ''))) = lower(t.mot)) desc,
                                       (p.avatar_url is not null) desc, p.full_name) as rang
    from public.profiles p, terme t
    where t.mot is not null
      and auth.uid() is not null
      and (public.sans_accent(p.full_name) ilike t.motif or public.sans_accent(p.display_name) ilike t.motif)
      and p.anonymized_at is null
      and p.departed_at is null
      and coalesce(btrim(p.full_name), btrim(p.display_name), '') <> ''
      and not exists (select 1 from public.profile_roles l where l.profile_id = p.id and l.role_slug = 'lecteur')
      and not exists (select 1 from wfg1.accounts a where a.user_id::text = p.legacy_id and a.role = 'reader')
      and coalesce(p.category::text, '') <> 'cinephile'
    order by rang
    limit greatest(p_limite, 0)
  ) c
  order by c.rang;
$$;

grant execute on function public.rechercher_talents_par_nom(text, integer) to authenticated;
