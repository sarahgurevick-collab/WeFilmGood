-- Logos des producteurs inscrits avec une adresse personnelle (18/10/2026,
-- Sarah : « essaie de deviner le site à partir du nom de société ») : le nom
-- de la société connu par WFG 1 sert à deviner le site. Si un autre
-- producteur de la même société a déjà un logo, on le reprend tel quel.
create or replace function public.producteurs_a_logo_par_societe(p_limite integer default 30)
returns table(profile_id uuid, nom text, societe text, pays text, logo_existant text, domaine_existant text)
language sql stable security definer set search_path = public, auth as $$
  with miens as (
    select p.id, p.full_name, btrim(a.society_name) as societe, p.country,
           lower(public.sans_accent(regexp_replace(btrim(a.society_name), '[^[:alnum:]]+', '', 'g'))) as cle
    from public.profiles p
    join wfg1.accounts a on a.user_id::text = p.legacy_id::text
    where p.category = 'producteur'
      and p.avatar_url is null
      and coalesce(btrim(a.society_name), '') <> ''
      and not exists (select 1 from public.logos_producteurs l where l.profile_id = p.id)
  ),
  connus as (
    select distinct on (lower(public.sans_accent(regexp_replace(btrim(a.society_name), '[^[:alnum:]]+', '', 'g'))))
           lower(public.sans_accent(regexp_replace(btrim(a.society_name), '[^[:alnum:]]+', '', 'g'))) as cle, l.url_logo, l.domaine
    from public.logos_producteurs l
    join public.profiles p on p.id = l.profile_id
    join wfg1.accounts a on a.user_id::text = p.legacy_id::text
    where l.statut in ('a_valider', 'valide') and coalesce(btrim(a.society_name), '') <> ''
    order by lower(public.sans_accent(regexp_replace(btrim(a.society_name), '[^[:alnum:]]+', '', 'g'))), l.statut desc
  )
  select m.id, m.full_name, m.societe, m.country, c.url_logo, c.domaine
  from miens m left join connus c on c.cle = m.cle
  order by random()
  limit p_limite;
$$;
revoke all on function public.producteurs_a_logo_par_societe(integer) from public, anon, authenticated;
grant execute on function public.producteurs_a_logo_par_societe(integer) to service_role;
