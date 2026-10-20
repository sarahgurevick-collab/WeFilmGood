-- =====================================================================
-- CinéMatch : avec quel profil a-t-on le plus de réponses en commun ?
-- (20/10/2026, Sarah)
--
-- On compare les réponses d'une personne aux 20 questions « si j'étais… »
-- à celles des profils qui y ont répondu. Le pourcentage est le nombre de
-- réponses identiques sur le nombre de questions auxquelles les deux ont
-- répondu ; il faut au moins 12 questions en commun pour que le score
-- compte (sinon un seul « oui » donnerait 100 %).
--
-- Sont écartés : la personne elle-même, les cinéphiles (Greenlighters) et
-- les lecteurs, dont le profil n'est vu que d'eux.
--
-- Elle renvoie aussi le métier et le pays du match (« Producteur · Singapour »),
-- seuls indices montrés à qui n'a pas d'adhésion ; le nom vient après.
--
-- La fonction renvoie des identifiants de profils : elle n'est donc
-- appelable que par le serveur (clé de service). C'est le serveur qui
-- décide de ce qu'il montre — le nom seulement aux adhérents.
-- =====================================================================

drop function if exists public.cinematch_meilleurs(jsonb, uuid, int);

create function public.cinematch_meilleurs(
  p_reponses jsonb,
  p_exclure uuid default null,
  p_limite int default 3
)
returns table (profile_id uuid, pourcentage int, communes int, comparees int, metier text, pays text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         round(100.0 * c.communes / c.comparees)::int,
         c.communes::int,
         c.comparees::int,
         (select ro.label_fr
            from public.profile_roles r
            join public.roles ro on ro.slug = r.role_slug
           where r.profile_id = p.id and ro.is_public
           order by (r.role_slug = 'producteur' and p.category::text = 'producteur') desc, ro.position
           limit 1),
         nullif(trim(p.country), '')
  from public.profiles p
  cross join lateral (
    select count(*) filter (where p.personality_answers ->> k.key = k.value) as communes,
           count(*) as comparees
    from jsonb_each_text(p_reponses) k
    where p.personality_answers ? k.key
  ) c
  where p.id is distinct from p_exclure
    and p.personality_answers is not null
    and coalesce(p.category::text, '') <> 'cinephile'
    and not exists (
      select 1 from public.profile_roles r
      where r.profile_id = p.id and r.role_slug = 'lecteur'
    )
    and c.comparees >= 12
  order by 2 desc, c.comparees desc, p.id
  limit greatest(p_limite, 1)
$$;

revoke all on function public.cinematch_meilleurs(jsonb, uuid, int) from public, anon, authenticated;
grant execute on function public.cinematch_meilleurs(jsonb, uuid, int) to service_role;
