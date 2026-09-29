-- Mots-clés des talents et des personnages (29/09/2026), tirés de leur
-- biographie, comme ceux des projets : générés par Claude en séance, par
-- lots, jamais par une clé d'API qui tournerait sur le site (décision de
-- Sarah du 19/09). Le vocabulaire est partagé avec les projets : « danse »
-- est le même mot-clé pour un projet, un talent ou un personnage.
alter table public.profile_keywords add column if not exists source text;

create table if not exists public.character_keywords (
  character_id uuid not null references public.characters(id) on delete cascade,
  keyword_id bigint not null references public.keywords(id) on delete cascade,
  source text,
  primary key (character_id, keyword_id)
);
create index if not exists character_keywords_keyword_idx on public.character_keywords (keyword_id);
create index if not exists profile_keywords_keyword_idx on public.profile_keywords (keyword_id);

alter table public.character_keywords enable row level security;
drop policy if exists "mots-clés de personnage réservés aux membres" on public.character_keywords;
create policy "mots-clés de personnage réservés aux membres"
  on public.character_keywords for select to authenticated
  using (true);

-- Ce qui a déjà été traité, même sans mot-clé trouvé (biographie trop
-- vague) : le lot suivant ne le reprend pas. L'empreinte permet de
-- retraiter une biographie réécrite.
create table if not exists public.mots_cles_traites (
  genre text not null check (genre in ('talent', 'personnage')),
  id uuid not null,
  empreinte text not null,
  traite_le timestamptz not null default now(),
  primary key (genre, id)
);
alter table public.mots_cles_traites enable row level security;

-- Pose les mots-clés d'un talent ou d'un personnage : crée les mots qui
-- manquent (rapprochés par slug, minuscules sans accents), remplace ceux
-- que l'IA avait posés avant, garde ceux posés à la main. Réservée à
-- l'administration de la base (aucun rôle de l'API n'y a accès).
create or replace function public.poser_mots_cles(p_genre text, p_id uuid, p_mots text[], p_empreinte text)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ids bigint[];
begin
  -- En deux temps : dans une même requête, les mots tout juste créés ne
  -- seraient pas encore visibles, et seraient oubliés.
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
