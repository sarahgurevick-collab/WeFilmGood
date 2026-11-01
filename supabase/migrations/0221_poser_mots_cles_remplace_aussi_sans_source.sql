-- Mots-clés des projets refaits par l'IA en lisant toute la fiche (01/11/2026) :
-- titre, tagline, logline, « Plus… » (synopsis), fiches de lecture et biographie
-- de l'auteur. La pose remplace désormais TOUT ce que l'IA avait posé : les mots
-- de la passe du 04/10 (source 'ia') ET ceux de la passe du 19/09, posés sans
-- source (null). Les mots repris de WFG 1 ('wfg1') et ceux demandés par les
-- auteurs ('demande_auteur') restent. La tagline n'est plus touchée ici (le
-- script de pose ne l'écrit plus).
create or replace function public.poser_mots_cles(p_genre text, p_id uuid, p_mots text[], p_empreinte text)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ids bigint[];
begin
  create temporary table if not exists _propres (slug text, label text) on commit drop;
  delete from _propres;
  insert into _propres
  select distinct on (slug) slug, label
  from (
    select btrim(m) as label,
           btrim(regexp_replace(lower(public.sans_accent(btrim(m))), '[^a-z0-9]+', '_', 'g'), '_') as slug
    from unnest(p_mots) m
  ) x
  where slug <> '' and length(label) <= 60;

  insert into public.keywords (slug, label_fr)
  select slug, lower(left(label, 1)) || substr(label, 2) from _propres
  on conflict (slug) do nothing;

  select array_agg(k.id) into v_ids
  from public.keywords k join _propres p on p.slug = k.slug;

  if p_genre = 'talent' then
    delete from public.profile_keywords where profile_id = p_id and source = 'ia';
    insert into public.profile_keywords (profile_id, keyword_id, source)
    select p_id, unnest(coalesce(v_ids, '{}')), 'ia' on conflict do nothing;
  elsif p_genre = 'personnage' then
    delete from public.character_keywords where character_id = p_id and source = 'ia';
    insert into public.character_keywords (character_id, keyword_id, source)
    select p_id, unnest(coalesce(v_ids, '{}')), 'ia' on conflict do nothing;
  elsif p_genre = 'projet' then
    -- 'ia' = passe du 04/10 ; null = passe du 19/09 (avant la colonne source)
    delete from public.project_keywords where project_id = p_id and (source = 'ia' or source is null);
    -- un mot déjà posé par l'auteur sur WFG 1 garde sa provenance
    insert into public.project_keywords (project_id, keyword_id, source)
    select p_id, unnest(coalesce(v_ids, '{}')), 'ia' on conflict do nothing;
  else
    raise exception 'genre inconnu : %', p_genre;
  end if;

  insert into public.mots_cles_traites (genre, id, empreinte)
  values (p_genre, p_id, p_empreinte)
  on conflict (genre, id) do update set empreinte = excluded.empreinte, traite_le = now();

  return coalesce(array_length(v_ids, 1), 0);
end;
$$;
revoke all on function public.poser_mots_cles(text, uuid, text[], text) from public, anon, authenticated, service_role;
notify pgrst, 'reload schema';
