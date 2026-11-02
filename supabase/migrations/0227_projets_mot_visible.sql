-- Le trait des Galaxies (02/11/2026, Sarah, après consultation) : avant le
-- trait, les projets où le mot tapé est visible sur la fiche (titre,
-- tagline, logline, résumé, pays, personnages, comédiens) ; après, ceux où
-- il ne l'est pas — trouvés par un mot-clé (que seule l'administration
-- voit) ou par le voisinage de sens. Le site donne les projets trouvés, la
-- fonction rend ceux où chaque mot de la recherche est visible.
create or replace function public.projets_mot_visible(q text, p_projets uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  with mots as (
    select w, '%' || replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
    from public.mots_de_recherche(q) w
  ),
  -- Une recherche sans mot de trois lettres (« ok ») : le texte entier.
  motifs as (
    select motif from mots
    union all
    select '%' || replace(replace(replace(public.sans_accent(btrim(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    where not exists (select 1 from mots) and nullif(btrim(q), '') is not null
  ),
  textes as (
    select p.id,
           public.sans_accent(concat_ws(' ', p.title, p.tagline, p.logline, p.synopsis, p.country,
             (select string_agg(concat_ws(' ', c.name, c.actor_name, c.biography), ' ') from public.characters c where c.project_id = p.id),
             (select string_agg(a.libelle, ' ') from public.project_actors a where a.project_id = p.id))) as texte
    from public.projects p
    where p.id = any(p_projets)
  )
  select t.id
  from textes t
  where auth.uid() is not null
    and not exists (select 1 from motifs m where t.texte not ilike m.motif);
$$;

revoke all on function public.projets_mot_visible(text, uuid[]) from public, anon;
grant execute on function public.projets_mot_visible(text, uuid[]) to authenticated, service_role;
