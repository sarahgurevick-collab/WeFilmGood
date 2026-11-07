-- Les mots-clés de l'auteur passent en trois nuages repris de WFG 1, dix
-- mots au plus par ligne, plus dix mots libres (07/11/2026, Sarah : « Limite
-- à 10 par catégorie ») : la base en accepte quarante par fiche. La limite
-- par ligne est tenue par le formulaire.
CREATE OR REPLACE FUNCTION public.poser_mots_cles_auteur(p_project uuid, p_mots text[])
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
  limit 40;

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
$function$

;
