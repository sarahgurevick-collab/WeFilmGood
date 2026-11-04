-- Genres en deux niveaux (04/11/2026, liste validée par Sarah).
--
-- 7 familles (le « genre principal », obligatoire) :
--   Drame, Comédie, Récit spéculatif, Récit criminel, Récit historique,
--   Aventure, Film musical.
-- Les trois genres réunis de WFG 1 (Horreur / SF / Fantastique…) venaient du
-- paiement (trois genres pour le prix d'un) : ils deviennent des familles.
-- Biopic, Animation et Documentaire ne sont plus des genres mais des
-- sous-genres : biopic dans Drame, Récit historique et Film musical ;
-- animation et documentaire dans toutes les familles.
--
-- Sous-genres : 1 à 3 par fiche, facultatifs, pris dans la famille choisie
-- (plus animation / documentaire). Ils servent sur la fiche seulement : les
-- Galaxies gardent la famille comme seul filtre (Sarah : afficher le plus de
-- projets possible). Chaque sous-genre pose aussi ses mots-clés sur la fiche
-- (source 'sous_genre'), pour la recherche et le nuage.
--
-- Fiches existantes : anciens genres sauvegardés (sauvegarde_genres_0231) ;
-- les sous-genres sont pré-remplis depuis les genres et genres affinés de
-- WFG 1. Retour : étiquette git genres-avant-familles + la sauvegarde.

-- ---------------------------------------------------------------------
-- 0. Sauvegardes (une seule fois)
-- ---------------------------------------------------------------------
create table if not exists public.sauvegarde_genres_0231 as
  select id as project_id, genre_slug, genre_legacy from public.projects;
create table if not exists public.sauvegarde_profile_genres_0231 as
  select * from public.profile_genres;
revoke all on public.sauvegarde_genres_0231, public.sauvegarde_profile_genres_0231 from anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. Les 7 familles
-- ---------------------------------------------------------------------
insert into public.genres (slug, label_fr, label_en, position) values
  ('drame',            'Drame',             'Drama',              1),
  ('comedie',          'Comédie',           'Comedy',             2),
  ('recit_speculatif', 'Récit spéculatif',  'Speculative fiction', 3),
  ('recit_criminel',   'Récit criminel',    'Crime story',        4),
  ('recit_historique', 'Récit historique',  'Historical story',   5),
  ('aventure',         'Aventure',          'Adventure',          6),
  ('film_musical',     'Film musical',      'Musical',            7)
on conflict (slug) do update
  set label_fr = excluded.label_fr, label_en = excluded.label_en, position = excluded.position;

-- ---------------------------------------------------------------------
-- 2. Les sous-genres
-- ---------------------------------------------------------------------
create table if not exists public.sous_genres (
  slug      text primary key,
  label_fr  text not null,
  -- familles où il est proposé ; null = toutes (animation, documentaire)
  familles  text[],
  -- mots-clés qu'il pose sur la fiche
  mots_cles text[] not null,
  position  int not null default 0
);
alter table public.sous_genres enable row level security;
drop policy if exists "sous-genres lisibles par tous" on public.sous_genres;
create policy "sous-genres lisibles par tous" on public.sous_genres for select using (true);

insert into public.sous_genres (slug, label_fr, familles, mots_cles, position) values
  ('drame_social',           'Drame social',               '{drame}', '{drame social}', 1),
  ('drame_familial',         'Drame familial',             '{drame}', '{drame familial}', 2),
  ('drame_psychologique',    'Drame psychologique',        '{drame}', '{drame psychologique}', 3),
  ('drame_romantique',       'Drame romantique / romance', '{drame}', '{drame romantique,romance}', 4),
  ('comedie_dramatique',     'Comédie dramatique',         '{drame}', '{comédie dramatique}', 5),
  ('passage_age_adulte',     'Passage à l''âge adulte',    '{drame}', '{passage à l''âge adulte}', 6),
  ('tragedie',               'Tragédie / mélodrame',       '{drame}', '{tragédie,mélodrame}', 7),
  ('biopic',                 'Biopic',                     '{drame,recit_historique,film_musical}', '{biopic}', 8),
  ('comedie_romantique',     'Comédie romantique',         '{comedie}', '{comédie romantique}', 10),
  ('comedie_sociale',        'Comédie sociale',            '{comedie}', '{comédie sociale}', 11),
  ('comedie_noire',          'Comédie noire',              '{comedie}', '{comédie noire}', 12),
  ('comedie_absurde',        'Comédie absurde / décalée',  '{comedie}', '{comédie absurde,comédie décalée}', 13),
  ('burlesque',              'Burlesque',                  '{comedie}', '{burlesque}', 14),
  ('comedie_populaire',      'Comédie populaire',          '{comedie}', '{comédie populaire}', 15),
  ('science_fiction',        'Science-fiction',            '{recit_speculatif}', '{science-fiction}', 20),
  ('anticipation',           'Anticipation / dystopie',    '{recit_speculatif}', '{anticipation,dystopie}', 21),
  ('fantastique',            'Fantastique',                '{recit_speculatif}', '{fantastique}', 22),
  ('fantasy',                'Fantasy / conte',            '{recit_speculatif}', '{fantasy,conte}', 23),
  ('horreur',                'Horreur',                    '{recit_speculatif}', '{horreur}', 24),
  ('realisme_magique',       'Réalisme magique',           '{recit_speculatif}', '{réalisme magique}', 25),
  ('thriller',               'Thriller',                   '{recit_criminel}', '{thriller}', 30),
  ('thriller_psychologique', 'Thriller psychologique',     '{recit_criminel}', '{thriller psychologique}', 31),
  ('policier',               'Policier / polar',           '{recit_criminel}', '{policier,polar}', 32),
  ('film_noir',              'Film noir',                  '{recit_criminel}', '{film noir}', 33),
  ('suspense',               'Suspense / mystère',         '{recit_criminel}', '{suspense,mystère}', 34),
  ('historique',             'Historique',                 '{recit_historique}', '{historique}', 40),
  ('guerre',                 'Guerre',                     '{recit_historique}', '{guerre}', 41),
  ('western',                'Western',                    '{recit_historique}', '{western}', 42),
  ('peplum',                 'Péplum',                     '{recit_historique}', '{péplum}', 43),
  ('capes_epees',            'Capes et épées',             '{recit_historique}', '{capes et épées}', 44),
  ('action',                 'Action',                     '{aventure}', '{action}', 50),
  ('aventure',               'Aventure',                   '{aventure}', '{aventure}', 51),
  ('road_movie',             'Road movie',                 '{aventure}', '{road movie}', 52),
  ('film_familial',          'Film familial',              '{aventure}', '{film familial}', 53),
  ('comedie_musicale',       'Comédie musicale',           '{film_musical}', '{comédie musicale}', 60),
  ('animation',              'Animation',                  null, '{animation}', 90),
  ('documentaire',           'Documentaire',               null, '{documentaire}', 91)
on conflict (slug) do update set label_fr = excluded.label_fr, familles = excluded.familles,
  mots_cles = excluded.mots_cles, position = excluded.position;

create table if not exists public.project_sous_genres (
  project_id      uuid not null references public.projects(id) on delete cascade,
  sous_genre_slug text not null references public.sous_genres(slug) on delete cascade,
  position        int  not null default 0,
  primary key (project_id, sous_genre_slug)
);
alter table public.project_sous_genres enable row level security;
drop policy if exists "sous-genres des projets lisibles des membres" on public.project_sous_genres;
create policy "sous-genres des projets lisibles des membres"
  on public.project_sous_genres for select using (auth.uid() is not null);

-- Un sous-genre pose ses mots-clés ; retiré, il les reprend (seulement ceux
-- qu'il avait posés). Un mot déjà posé par l'IA passe en source 'sous_genre'
-- pour qu'une nouvelle passe de l'IA ne l'efface pas.
create or replace function public.sous_genre_mots_cles() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m text;
  s text;
  kid bigint;
begin
  if tg_op = 'INSERT' then
    for m in select unnest(mots_cles) from public.sous_genres where slug = new.sous_genre_slug loop
      s := btrim(regexp_replace(lower(public.sans_accent(m)), '[^a-z0-9]+', '_', 'g'), '_');
      insert into public.keywords (slug, label_fr) values (s, m) on conflict (slug) do nothing;
      select id into kid from public.keywords where slug = s;
      insert into public.project_keywords (project_id, keyword_id, source)
      values (new.project_id, kid, 'sous_genre')
      on conflict (project_id, keyword_id) do update set source = 'sous_genre'
        where public.project_keywords.source is null or public.project_keywords.source = 'ia';
    end loop;
    return new;
  else
    delete from public.project_keywords pk
    using public.keywords k, public.sous_genres sg
    where sg.slug = old.sous_genre_slug
      and k.slug in (select btrim(regexp_replace(lower(public.sans_accent(x)), '[^a-z0-9]+', '_', 'g'), '_') from unnest(sg.mots_cles) x)
      and pk.keyword_id = k.id and pk.project_id = old.project_id and pk.source = 'sous_genre';
    return old;
  end if;
end $$;

drop trigger if exists sous_genre_mots_cles on public.project_sous_genres;
create trigger sous_genre_mots_cles after insert or delete on public.project_sous_genres
  for each row execute function public.sous_genre_mots_cles();

-- Enregistrement depuis la fiche : l'auteur ou l'administration ; sous-genres
-- de la famille de la fiche seulement (ou proposés partout), trois au plus.
create or replace function public.poser_sous_genres(p_projet uuid, p_slugs text[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  fam text;
begin
  select genre_slug into fam from public.projects
   where id = p_projet and (owner_id = auth.uid() or public.is_admin());
  if not found then
    raise exception 'Fiche introuvable';
  end if;
  -- Les sous-genres valables (famille de la fiche ou proposés partout),
  -- dans l'ordre reçu, trois au plus.
  create temporary table if not exists _sous_genres_choisis (slug text, n int) on commit drop;
  delete from _sous_genres_choisis;
  insert into _sous_genres_choisis
  select v.slug, row_number() over (order by v.ordre)
  from (
    select sg.slug, min(x.ordre) as ordre
    from unnest(coalesce(p_slugs, '{}')) with ordinality x(slug, ordre)
    join public.sous_genres sg on sg.slug = x.slug
    where sg.familles is null or fam = any (sg.familles)
    group by sg.slug
  ) v;
  delete from _sous_genres_choisis where n > 3;

  delete from public.project_sous_genres ps
   where ps.project_id = p_projet
     and not exists (select 1 from _sous_genres_choisis c where c.slug = ps.sous_genre_slug);
  insert into public.project_sous_genres (project_id, sous_genre_slug, position)
  select p_projet, c.slug, c.n from _sous_genres_choisis c
  on conflict (project_id, sous_genre_slug) do update set position = excluded.position;
end $$;
revoke all on function public.poser_sous_genres(uuid, text[]) from public, anon;
grant execute on function public.poser_sous_genres(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Les fiches existantes : nouvelle famille
-- ---------------------------------------------------------------------
update public.projects set genre_slug = 'recit_speculatif' where genre_slug = 'horreur_scifi_fantastique';
update public.projects set genre_slug = 'recit_criminel'   where genre_slug = 'thriller_policier';
update public.projects set genre_slug = 'recit_historique' where genre_slug = 'histoire_guerre';
update public.projects set genre_slug = 'film_musical'     where genre_slug = 'films_musicaux';
-- Western et capes et épées sont maintenant dans Récit historique.
update public.projects set genre_slug = 'recit_historique'
 where genre_slug = 'aventure' and genre_legacy in ('Western', 'Capes et Épées');

-- Biopic, animation, documentaire : la famille vient d'abord des autres
-- genres que la fiche avait sur WFG 1, sinon de ses mots-clés, sinon Drame.
create temporary table familles_wfg1 (code int, famille text) on commit drop;
insert into familles_wfg1 values
  (6,'drame'),(21,'drame'),(20,'drame'),(22,'drame'),(7,'drame'),(8,'drame'),(34,'drame'),(37,'drame'),
  (4,'comedie'),(16,'comedie'),(13,'comedie'),
  (11,'recit_speculatif'),(17,'recit_speculatif'),(9,'recit_speculatif'),(23,'recit_speculatif'),(24,'recit_speculatif'),(28,'recit_speculatif'),
  (18,'recit_criminel'),(10,'recit_criminel'),(29,'recit_criminel'),
  (1,'aventure'),(0,'aventure'),(15,'aventure'),(12,'aventure'),(36,'aventure'),
  (19,'recit_historique'),(33,'recit_historique'),(32,'recit_historique'),(35,'recit_historique'),(30,'recit_historique'),
  (14,'film_musical'),(25,'film_musical'),(31,'film_musical');

create temporary table a_ranger on commit drop as
  select id, legacy_id, genre_slug as ancien from public.projects
  where genre_slug in ('biopic', 'animation', 'documentaire');

create temporary table rangement on commit drop as
with par_wfg1 as (
  select distinct on (a.id) a.id, f.famille
  from a_ranger a
  join wfg1.projects w on w.project_id::text = a.legacy_id
  cross join lateral regexp_matches(w.keywords, '\|1-(\d+)(?=\|)', 'g') with ordinality m(c, n)
  join familles_wfg1 f on f.code = m.c[1]::int
  order by a.id, m.n
),
mots(famille, motif) as (values
  ('comedie', '^(comédie|comedie|humour|comique|satire|parodie)'),
  ('recit_speculatif', '^(science-fiction|fantastique|fantasy|horreur|dystopie|anticipation|surnaturel|épouvante|post-apocalyptique)'),
  ('recit_criminel', '^(thriller|policier|polar|enquête|crime|meurtre|film noir)'),
  ('recit_historique', '^(historique|guerre|seconde guerre mondiale|première guerre mondiale|moyen âge|moyen-âge|histoire)'),
  ('film_musical', '^(musique|musical|comédie musicale|opéra|danse)'),
  ('aventure', '^(aventure|action|road movie|voyage|quête)')
),
par_mots as (
  select distinct on (a.id) a.id, mo.famille
  from a_ranger a
  join public.project_keywords pk on pk.project_id = a.id
  join public.keywords k on k.id = pk.keyword_id
  join mots mo on lower(k.label_fr) ~ mo.motif
  group by a.id, mo.famille
  order by a.id, count(*) desc, mo.famille
)
select a.id, a.ancien,
  case when a.ancien = 'biopic' and coalesce(w.famille, m.famille) not in ('drame', 'recit_historique', 'film_musical')
         then 'drame'
       else coalesce(w.famille, m.famille, 'drame') end as famille,
  case when w.famille is not null then 'genre WFG 1' when m.famille is not null then 'mots-clés' else 'par défaut' end as methode
from a_ranger a
left join par_wfg1 w on w.id = a.id
left join par_mots m on m.id = a.id;

create table if not exists public.genres_ranges_0231 as select * from rangement;
revoke all on public.genres_ranges_0231 from anon, authenticated;

update public.projects p set genre_slug = r.famille from rangement r where p.id = r.id;

-- ---------------------------------------------------------------------
-- 4. Les genres préférés des profils, puis retrait des anciens genres
-- ---------------------------------------------------------------------
insert into public.profile_genres (profile_id, genre_slug)
select profile_id, case genre_slug
    when 'horreur_scifi_fantastique' then 'recit_speculatif'
    when 'thriller_policier' then 'recit_criminel'
    when 'histoire_guerre' then 'recit_historique'
    when 'films_musicaux' then 'film_musical' end
from public.profile_genres
where genre_slug in ('horreur_scifi_fantastique', 'thriller_policier', 'histoire_guerre', 'films_musicaux')
on conflict do nothing;

delete from public.genres
 where slug in ('horreur_scifi_fantastique', 'thriller_policier', 'histoire_guerre', 'films_musicaux', 'biopic', 'animation', 'documentaire');

-- ---------------------------------------------------------------------
-- 5. Sous-genres pré-remplis : d'abord biopic / animation / documentaire
--    (ancien genre ou format), puis les genres et genres affinés de WFG 1
--    dans l'ordre où l'auteur les avait mis ; famille de la fiche seulement,
--    trois au plus.
-- ---------------------------------------------------------------------
create temporary table codes_sous_genres (code text, sous_genre text) on commit drop;
insert into codes_sous_genres values
  ('1-0','action'),('1-1','aventure'),('1-10','film_noir'),('1-11','horreur'),('1-12','action'),
  ('1-14','comedie_musicale'),('1-15','road_movie'),('1-16','comedie_romantique'),('1-17','science_fiction'),
  ('1-18','thriller'),('1-19','western'),('1-2','animation'),('1-20','comedie_dramatique'),
  ('1-21','drame_psychologique'),('1-23','fantastique'),('1-24','anticipation'),('1-26','animation'),
  ('1-29','policier'),('1-3','biopic'),('1-30','peplum'),('1-32','historique'),('1-33','capes_epees'),
  ('1-34','drame_romantique'),('1-35','guerre'),('1-5','documentaire'),('1-9','fantasy'),
  ('2-11','passage_age_adulte'),('2-12','suspense'),('2-13','science_fiction'),('2-15','anticipation'),
  ('2-17','fantasy'),('2-18','film_familial'),('2-2','comedie_absurde'),('2-20','horreur'),
  ('2-21','historique'),('2-22','historique'),('2-27','tragedie'),('2-29','suspense'),('2-30','film_noir'),
  ('2-34','comedie_absurde'),('2-4','burlesque'),('2-44','horreur'),('2-45','suspense'),('2-47','western'),
  ('2-5','comedie_noire'),('2-50','tragedie'),('2-51','fantastique'),('2-53','horreur'),('2-56','animation'),
  ('2-57','fantasy'),('2-59','fantasy'),('2-6','comedie_noire'),('2-60','fantastique'),('2-62','thriller'),
  ('2-63','realisme_magique'),('2-64','drame_social'),('2-66','comedie_absurde'),('2-68','animation'),
  ('2-69','fantastique'),('2-70','historique'),('2-71','comedie_sociale'),('2-72','policier'),
  ('2-74','animation'),('2-77','fantastique'),('2-81','biopic'),('2-83','burlesque'),('2-84','policier'),
  ('2-85','drame_familial'),('2-88','comedie_populaire'),('2-90','science_fiction'),
  ('2-92','thriller_psychologique'),('2-93','drame_romantique'),('2-99','horreur'),('2-101','horreur');

with candidats as (
  select r.id as project_id, r.ancien as sous_genre, 0 as rang from rangement r
  union all
  select p.id, 'documentaire', 0 from public.projects p where p.format = 'documentaire'
  union all
  select p.id, c.sous_genre, m.n
  from public.projects p
  join wfg1.projects w on w.project_id::text = p.legacy_id
  cross join lateral regexp_matches(w.keywords, '\|(\d+-\d+)(?=\|)', 'g') with ordinality m(c, n)
  join codes_sous_genres c on c.code = m.c[1]
),
valides as (
  select distinct on (c.project_id, c.sous_genre) c.project_id, c.sous_genre, c.rang
  from candidats c
  join public.projects p on p.id = c.project_id
  join public.sous_genres sg on sg.slug = c.sous_genre
  where p.genre_slug is not null and (sg.familles is null or p.genre_slug = any (sg.familles))
    and not exists (select 1 from public.project_sous_genres x where x.project_id = c.project_id)
  order by c.project_id, c.sous_genre, c.rang
),
classes as (
  select v.*, row_number() over (partition by v.project_id order by v.rang, v.sous_genre) as n from valides v
)
insert into public.project_sous_genres (project_id, sous_genre_slug, position)
select project_id, sous_genre, n from classes where n <= 3
on conflict do nothing;
