-- Les nuages de mots-clés de la fiche ne reprennent ni les genres
-- principaux ni les mots de l'escalier (07/11/2026, Sarah : « Il ne faudrait
-- pas reprendre les mots clés genres principal. Ni ceux qui sont sur
-- l'escalier ») : l'auteur les a déjà choisis plus haut.
--
-- Un mot de l'escalier = une famille (Drame, Récit criminel…), un sous-genre
-- et les mots-clés qu'il pose (Policier / polar → policier, polar),
-- Fiction / Documentaire et les techniques. Comparaison sans accents, sans
-- espaces ni ponctuation (science-fiction = science fiction). Deux simples
-- variantes en plus : « cape et épée » et « film musical ».

-- La liste est rangée une fois (les suggestions la consultent pour chaque
-- mot candidat) et refaite dès qu'un genre ou un sous-genre change.
create table if not exists public.mots_escalier (cle text primary key);
alter table public.mots_escalier enable row level security;

create or replace function public.cle_mot_escalier(p_label text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(public.sans_accent(coalesce(p_label, ''))), '[^a-z0-9]+', '', 'g');
$$;

create or replace function public.refaire_mots_escalier()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  delete from public.mots_escalier;
  insert into public.mots_escalier (cle)
  select distinct public.cle_mot_escalier(m) from (
    select label_fr as m from public.genres
    union all select btrim(x) from public.sous_genres, unnest(string_to_array(label_fr, '/')) x
    union all select unnest(mots_cles) from public.sous_genres
    union all select unnest(array['fiction', 'documentaire', 'prise de vues réelles', 'prises de vues réelles',
                                  'animation', 'contenu IA', 'médias mixtes', 'cape et épée', 'film musical'])
  ) e
  where public.cle_mot_escalier(m) <> '';
  return null;
end;
$fn$;

drop trigger if exists refaire_mots_escalier on public.genres;
create trigger refaire_mots_escalier after insert or update or delete on public.genres
  for each statement execute function public.refaire_mots_escalier();
drop trigger if exists refaire_mots_escalier on public.sous_genres;
create trigger refaire_mots_escalier after insert or update or delete on public.sous_genres
  for each statement execute function public.refaire_mots_escalier();

-- Remplissage : une mise à jour sans effet suffit à déclencher le calcul.
update public.genres set position = position where false;
update public.sous_genres set position = position where false;

create or replace function public.mot_de_l_escalier(p_label text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.mots_escalier where cle = public.cle_mot_escalier(p_label));
$$;

-- Hors des nuages.
delete from public.nuages_mots_cles where public.mot_de_l_escalier(label);

-- Hors des suggestions du champ, et refusés à l'enregistrement (un mot déjà
-- posé sur la fiche par l'auteur peut rester).
create or replace function public.mot_cle_proposable(p_keyword bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.mot_de_l_escalier((select label_fr from public.keywords where id = p_keyword))
     and (exists (select 1 from public.keywords k join public.nuages_mots_cles n on n.slug = k.slug where k.id = p_keyword)
          or exists (select 1 from public.project_keywords pk
                      where pk.keyword_id = p_keyword and pk.source in ('ia', 'forme', 'sous_genre')));
$$;
