-- =====================================================================
-- Témoignages publics.
--
-- Depuis la migration 0021, la table profiles n'est plus lisible que par
-- les utilisateurs connectés (annuaire réservé aux membres). Or, comme
-- sur la v1 de la plateforme, les témoignages doivent rester visibles
-- dans le menu même sans être connecté.
--
-- On expose donc une vue dédiée, volontairement limitée à la photo, au
-- nom et au texte du témoignage, et seulement pour les profils qui ont
-- explicitement coché testimonial_is_public. Le reste du profil (email,
-- pays, bio, etc.) reste privé.
-- =====================================================================

create or replace view public.temoignages_publics as
select
  id,
  coalesce(display_name, full_name) as nom,
  avatar_url,
  testimonial
from public.profiles
where testimonial_is_public = true
  and testimonial is not null
  and btrim(testimonial) <> '';

grant select on public.temoignages_publics to anon, authenticated;
