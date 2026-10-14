-- La page Témoignages ne montre que les producteurs (essai demandé par
-- Sarah le 14/10/2026 : la sphère de 171 photos pèse lourd, et elle veut
-- voir le rendu avec les seuls producteurs, 14). La vue reçoit la
-- catégorie du membre pour que la page puisse filtrer.
create or replace view public.temoignages_publics as
select
  p.id::text                                as id,
  coalesce(p.display_name, p.full_name)     as nom,
  p.avatar_url                              as avatar_url,
  p.testimonial                             as testimonial,
  p.category::text                          as categorie
from public.profiles p
where p.testimonial_is_public = true
  and p.testimonial is not null
  and btrim(p.testimonial) <> ''
union all
select
  'ancien-' || l.legacy_user_id::text,
  l.full_name,
  null::text,
  l.testimonial,
  l.category::text
from public.legacy_profiles l
where l.claimed_by is null
  and l.testimonial_is_public = true
  and l.testimonial is not null
  and btrim(l.testimonial) <> '';

grant select on public.temoignages_publics to anon, authenticated;
