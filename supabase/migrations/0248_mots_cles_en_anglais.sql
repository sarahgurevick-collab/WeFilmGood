-- Les mots-clés en anglais (08/11/2026, Sarah : « Les mots clés dans le
-- cloud sont tous en français »). Les mots-clés sont des données, pas des
-- textes du site : Google Traduction ne les traduit pas (et le nuage est un
-- dessin où il ne passe pas). La colonne keywords.label_en, prévue depuis le
-- départ et restée vide, est remplie par une passe automatique (Claude, par
-- lots) ; les fonctions qui servent les nuages renvoient désormais les deux
-- langues, et le site affiche l'anglais quand le globe est sur EN. Le mot
-- envoyé au serveur reste toujours le français (slug).

-- Les trois nuages de la fiche : [mot, poids, mot anglais].
create or replace function public.nuages_mots_cles_fiche()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_object_agg(ligne, mots), '{}'::jsonb)
  from (select n.ligne, jsonb_agg(jsonb_build_array(n.label, n.poids, k.label_en) order by n.position) as mots
        from public.nuages_mots_cles n
        left join public.keywords k on k.slug = n.slug
        group by n.ligne) x
  where auth.uid() is not null;
$function$;

-- Les suggestions pendant la frappe : on cherche aussi dans l'anglais, et on
-- renvoie l'anglais avec le français.
drop function if exists public.suggerer_mots_cles(text, integer);
create function public.suggerer_mots_cles(q text, p_limite integer default 8)
 returns table(label text, theme text, label_en text)
 language sql
 stable security definer
 set search_path to 'public', 'extensions'
as $function$
  with t as (select lower(public.sans_accent(btrim(q))) as mot),
  candidats as (
    select k.id, coalesce(n.label, k.label_fr) as label, coalesce(n.ligne, k.theme) as theme, k.label_en,
           lower(public.sans_accent(k.label_fr)) as base,
           lower(public.sans_accent(coalesce(k.label_en, ''))) as base_en, n.poids
    from public.keywords k
    left join public.nuages_mots_cles n on n.slug = k.slug, t
    where length(t.mot) >= 2
      and (lower(public.sans_accent(k.label_fr)) like '%' || replace(replace(t.mot, '%', ''), '_', '') || '%'
           or lower(public.sans_accent(k.label_fr)) % t.mot
           or lower(public.sans_accent(coalesce(k.label_en, ''))) like '%' || replace(replace(t.mot, '%', ''), '_', '') || '%'
           or lower(public.sans_accent(coalesce(k.label_en, ''))) % t.mot)
  )
  select c.label, c.theme, c.label_en
  from candidats c, t
  where auth.uid() is not null
    and (c.base like '%' || t.mot || '%' or similarity(c.base, t.mot) >= 0.45
         or c.base_en like '%' || t.mot || '%' or similarity(c.base_en, t.mot) >= 0.45)
    and public.mot_cle_proposable(c.id)
  order by (c.base like t.mot || '%' or c.base_en like t.mot || '%') desc,
           (c.base like '%' || t.mot || '%' or c.base_en like '%' || t.mot || '%') desc,
           coalesce(c.poids, 0) + (select count(*) from public.project_keywords pk where pk.keyword_id = c.id) desc,
           c.label
  limit greatest(1, least(p_limite, 20));
$function$;

-- Le nuage du Finder sans recherche : avec l'anglais.
drop function if exists public.nuage_mots_cles(integer);
create function public.nuage_mots_cles(p_limite integer default 80)
 returns table(label_fr text, effectif bigint, label_en text)
 language sql
 stable
as $function$
  select k.label_fr, count(*) as effectif, min(k.label_en) as label_en
  from public.keywords k
  join public.project_keywords pk on pk.keyword_id = k.id
  join public.projects p on p.id = pk.project_id
  where p.is_public
  group by k.label_fr
  order by effectif desc, k.label_fr asc
  limit p_limite;
$function$;

-- Les mots proches par le sens : avec l'anglais.
drop function if exists public.mots_cles_par_sens(vector, integer);
create function public.mots_cles_par_sens(p_vecteur vector, p_limite integer default 30)
 returns table(keyword_id bigint, label_fr text, effectif bigint, proximite real, label_en text)
 language sql
 stable security definer
 set search_path to ''
as $function$
  with proches as (
    select k.id, k.label_fr, k.label_en, 1 - (k.vecteur operator(extensions.<=>) p_vecteur) as proximite
    from public.keywords k
    where k.vecteur is not null
    order by k.vecteur operator(extensions.<=>) p_vecteur
    limit p_limite
  )
  select p.id, p.label_fr,
    (select count(*) from public.project_keywords pk
      join public.projects pr on pr.id = pk.project_id
      where pk.keyword_id = p.id and pr.is_public) as effectif,
    p.proximite::real,
    p.label_en
  from proches p
$function$;

-- Le nuage du Finder pendant une recherche : avec l'anglais.
drop function if exists public.mots_cles_proches(text, integer);
create function public.mots_cles_proches(q text, p_limite integer default 30)
 returns table(label_fr text, effectif bigint, score real, label_en text)
 language sql
 stable
as $function$
  with terme as (
    select nullif(btrim(q), '') as mot,
           '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  publics as (
    select pk.project_id, pk.keyword_id
    from public.project_keywords pk
    join public.projects p on p.id = pk.project_id
    where p.is_public
  ),
  usage_total as (
    select keyword_id, count(*) as total
    from publics
    group by keyword_id
  ),
  -- Sans texte : les mots-clés les plus posés.
  sans_texte as (
    select k.label_fr, u.total as effectif, u.total::real as score, k.label_en
    from usage_total u
    join public.keywords k on k.id = u.keyword_id, terme t
    where t.mot is null
    order by u.total desc
    limit p_limite
  ),
  familles(famille, mot) as (
    values
      ('horreur_scifi_fantastique', 'science-fiction'),
      ('horreur_scifi_fantastique', 'horreur'),
      ('horreur_scifi_fantastique', 'fantastique'),
      ('horreur_scifi_fantastique', 'fantasy'),
      ('horreur_scifi_fantastique', 'anticipation'),
      ('horreur_scifi_fantastique', 'épouvante'),
      ('thriller_policier', 'thriller'),
      ('thriller_policier', 'policier'),
      ('thriller_policier', 'polar'),
      ('thriller_policier', 'enquête'),
      ('histoire_guerre', 'historique'),
      ('histoire_guerre', 'histoire'),
      ('histoire_guerre', 'guerre'),
      ('films_musicaux', 'musical'),
      ('films_musicaux', 'musique'),
      ('films_musicaux', 'comédie musicale'),
      ('films_musicaux', 'opéra')
  ),
  -- Les mots de la famille du texte tapé, s'il en fait partie.
  mots_de_famille as (
    select f2.mot
    from familles f1
    join familles f2 on f2.famille = f1.famille, terme t
    where t.mot is not null and lower(t.mot) = f1.mot
  ),
  -- Les graines : le texte tapé, en français ou en anglais (08/11).
  graines as (
    select k.id
    from public.keywords k, terme t
    where t.mot is not null
      and (k.label_fr ilike t.motif or similarity(k.label_fr, t.mot) >= 0.45
           or k.label_en ilike t.motif or similarity(coalesce(k.label_en, ''), t.mot) >= 0.45)
    union
    select k.id
    from public.keywords k
    join mots_de_famille m on lower(k.label_fr) = m.mot
  ),
  fiches as (
    select distinct pb.project_id
    from publics pb
    join graines g on g.id = pb.keyword_id
  ),
  voisins as (
    select pb.keyword_id, count(*) as communs
    from fiches f
    join publics pb on pb.project_id = f.project_id
    group by pb.keyword_id
  ),
  avec_texte as (
    select k.label_fr,
           v.communs as effectif,
           (v.communs::real * v.communs::real / u.total::real) as score,
           k.label_en
    from voisins v
    join usage_total u on u.keyword_id = v.keyword_id
    join public.keywords k on k.id = v.keyword_id
    where v.communs >= 2 or v.keyword_id in (select id from graines)
    order by score desc, v.communs desc
    limit p_limite
  )
  select * from sans_texte
  union all
  select * from avec_texte;
$function$;
