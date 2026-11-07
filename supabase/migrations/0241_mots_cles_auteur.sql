-- Les mots-clés choisis par l'auteur (07/11/2026, Sarah) : un champ sous la
-- logline, « Mots clés essentiels pour trouver votre projet », dix mots au
-- plus. Ils sont rangés comme les mots demandés par les auteurs sur WFG 1
-- (source 'demande_auteur') : les 41 fiches reprises retrouvent les leurs
-- dans le champ, et la pose des mots-clés par l'IA (poser_mots_cles) n'y
-- touche jamais. Visibles sur la fiche pour l'auteur et l'administration
-- seulement ; dans le Finder, ils comptent comme le titre et la logline
-- (devant le trait).

create or replace function public.poser_mots_cles_auteur(p_project uuid, p_mots text[])
returns text[]
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ids bigint[];
begin
  if not (public.is_admin() or exists (select 1 from public.projects where id = p_project and owner_id = auth.uid())) then
    raise exception 'Réservé à l''auteur de la fiche';
  end if;

  create temporary table if not exists _mots_auteur (rang int, slug text, label text) on commit drop;
  delete from _mots_auteur;
  insert into _mots_auteur
  select rang, slug, label from (
    select distinct on (slug) rang, slug, label
    from (
      select o.n as rang, btrim(o.m) as label,
             btrim(regexp_replace(lower(public.sans_accent(btrim(o.m))), '[^a-z0-9]+', '_', 'g'), '_') as slug
      from unnest(coalesce(p_mots, '{}')) with ordinality o(m, n)
    ) x
    where slug <> '' and length(label) <= 60
    order by slug, rang
  ) y
  order by rang
  limit 10;

  insert into public.keywords (slug, label_fr)
  select slug, label from _mots_auteur
  on conflict (slug) do nothing;

  select coalesce(array_agg(k.id), '{}') into v_ids
  from public.keywords k join _mots_auteur m on m.slug = k.slug;

  delete from public.project_keywords
   where project_id = p_project and source = 'demande_auteur' and not (keyword_id = any (v_ids));

  insert into public.project_keywords (project_id, keyword_id, source)
  select p_project, unnest(v_ids), 'demande_auteur'
  on conflict (project_id, keyword_id) do update set source = 'demande_auteur';

  return array(select label from _mots_auteur order by rang);
end;
$$;

revoke all on function public.poser_mots_cles_auteur(uuid, text[]) from public, anon;
grant execute on function public.poser_mots_cles_auteur(uuid, text[]) to authenticated, service_role;

-- Devant le trait du Finder : un mot choisi par l'auteur compte comme un
-- mot écrit sur la fiche.
create or replace function public.projets_mot_visible(q text, p_projets uuid[])
 returns setof uuid
 language sql
 stable security definer
 set search_path to 'public', 'extensions'
as $function$
  with mots as (
    select w, '%' || replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif,
           public.rx_formes(w) as rx
    from public.mots_de_recherche(q) w
  ),
  -- Une recherche sans mot de trois lettres (« ok ») : le texte entier.
  motifs as (
    select motif, rx from mots
    union all
    select '%' || replace(replace(replace(public.sans_accent(btrim(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%', null
    where not exists (select 1 from mots) and nullif(btrim(q), '') is not null
  ),
  textes as (
    select p.id,
           public.sans_accent(concat_ws(' ', p.title, p.tagline, p.logline, p.synopsis, p.country,
             (select string_agg(concat_ws(' ', c.name, c.actor_name, c.biography), ' ') from public.characters c where c.project_id = p.id),
             (select string_agg(a.libelle, ' ') from public.project_actors a where a.project_id = p.id),
             (select string_agg(k.label_fr, ' ') from public.project_keywords pk join public.keywords k on k.id = pk.keyword_id
               where pk.project_id = p.id and pk.source = 'demande_auteur'))) as texte
    from public.projects p
    where p.id = any(p_projets)
  )
  select t.id
  from textes t
  where auth.uid() is not null
    and not exists (select 1 from motifs m where not public.contient(t.texte, m.motif, m.rx));
$function$;
