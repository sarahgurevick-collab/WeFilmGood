-- La Galaxie de Personnages sans mot cherché (02/10/2026) : quand le champ
-- de recherche est vide et qu'on choisit « Personnages », la Carte des
-- étoiles affiche les personnages au lieu des projets. Mêmes règles que la
-- recherche : membre connecté, projet visible des membres, avec vignette.
-- Ceux qui ont un portrait d'abord ; à l'intérieur, un tirage au sort qui
-- change chaque nuit, comme pour les projets.
create or replace function public.galaxie_personnages(p_limite integer default 60, p_decalage integer default 0)
returns table(id uuid, total bigint)
language sql
stable security definer
set search_path to 'public'
as $$
  select c.id, count(*) over () as total
  from public.characters c
  join public.projects p on p.id = c.project_id
  where auth.uid() is not null
    and p.is_public
    and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
  order by (c.photo_path is not null) desc, md5(c.id::text || current_date::text)
  limit greatest(p_limite, 0) offset greatest(p_decalage, 0);
$$;

revoke all on function public.galaxie_personnages(integer, integer) from public, anon;
grant execute on function public.galaxie_personnages(integer, integer) to authenticated;
