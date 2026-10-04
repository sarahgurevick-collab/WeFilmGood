-- Tagline des projets et mots-clés tirés de leur logline (04/10/2026).
-- Jusqu'ici la colonne « logline » portait ce que le site appelait « tagline » ;
-- sur WFG 1 elle contient de vraies loglines, parfois très longues. La tagline
-- est une phrase courte, écrite par Claude en séance à partir de la logline
-- (copie telle quelle quand la logline fait 140 caractères ou moins), et que
-- l'auteur peut remplacer à tout moment : « tagline_proposee » dit si le texte
-- vient de WeFilmGood. La logline n'est jamais modifiée.
alter table public.projects add column if not exists tagline text;
alter table public.projects add column if not exists tagline_proposee boolean not null default false;

-- Le suivi des mots-clés accepte maintenant les projets.
alter table public.mots_cles_traites drop constraint if exists mots_cles_traites_genre_check;
alter table public.mots_cles_traites
  add constraint mots_cles_traites_genre_check check (genre in ('talent', 'personnage', 'projet'));

-- Même fonction qu'en 0113, avec les projets : on remplace seulement les mots
-- posés par l'IA (source 'ia'), ceux de WFG 1 et les autres restent.
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
    delete from public.project_keywords where project_id = p_id and source = 'ia';
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
