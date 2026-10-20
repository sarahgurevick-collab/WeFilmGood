-- =====================================================================
-- CinéMatch : un profil sans catégorie n'est pas comparé (20/10/2026).
--
-- Une personne « du métier » qui vient de créer son profil par CinéMatch n'a
-- pas encore choisi sa catégorie (bloc 1) : on ne saurait afficher ni son
-- métier ni son pays. Elle entre dans les matchs des autres quand son profil
-- est complété.
-- =====================================================================

create or replace function public.cinematch_meilleurs(
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
    and p.category is not null
    and p.category::text <> 'cinephile'
    and not exists (
      select 1 from public.profile_roles r
      where r.profile_id = p.id and r.role_slug = 'lecteur'
    )
    and c.comparees >= 12
  order by 2 desc, c.comparees desc, p.id
  limit greatest(p_limite, 1)
$$;
