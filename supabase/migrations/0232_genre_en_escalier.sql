-- Le genre en quatre marches (04/11/2026, Sarah, d'après l'escalier du logo) :
--   1. la famille (genre thématique) ;
--   2. les sous-genres (facultatifs, trois au plus) ;
--   3. la posture : Fiction / Documentaire (au moins une, plusieurs possibles) ;
--   4. la technique : Prise de vues réelles / Animation / Contenu IA
--      (au moins une, plusieurs possibles ; « Contenu IA » = images ou voix
--      faites par l'IA).
-- « Aventure » devient « Récit d'aventure », « Film musical » « Récit
-- musical » ; Drame et Comédie restent.
-- Animation et Documentaire quittent les sous-genres pour les marches 3 et 4.
-- Fiches existantes : Documentaire si elles l'avaient, sinon Fiction ;
-- Animation si elles l'avaient, sinon Prise de vues réelles (les deux pour
-- les « mélange animation / live action » de WFG 1). L'auteur corrige.
-- Documentaire, Animation et Contenu IA posent aussi un mot-clé.

update public.genres set label_fr = 'Récit d''aventure', label_en = 'Adventure story' where slug = 'aventure';
update public.genres set label_fr = 'Récit musical', label_en = 'Musical story' where slug = 'film_musical';

alter table public.projects add column if not exists postures text[];
alter table public.projects add column if not exists techniques text[];

alter table public.projects drop constraint if exists projects_postures_valides;
alter table public.projects add constraint projects_postures_valides
  check (postures <@ array['fiction', 'documentaire']);
alter table public.projects drop constraint if exists projects_techniques_valides;
alter table public.projects add constraint projects_techniques_valides
  check (techniques <@ array['prises_de_vues_reelles', 'animation', 'contenu_ia']);

-- Pré-remplissage, une seule fois (fiches qui ont un genre et rien encore).
with doc as (
  select project_id from public.project_sous_genres where sous_genre_slug = 'documentaire'
  union select id from public.projects where format = 'documentaire'
),
anim as (
  select project_id from public.project_sous_genres where sous_genre_slug = 'animation'
),
mixte as (
  select p.id as project_id
  from public.projects p join wfg1.projects w on w.project_id::text = p.legacy_id
  where w.keywords like '%|2-56|%'
)
update public.projects p set
  postures = case when p.id in (select project_id from doc) then array['documentaire'] else array['fiction'] end,
  techniques = case
    when p.id in (select project_id from mixte) then array['prises_de_vues_reelles', 'animation']
    when p.id in (select project_id from anim) then array['animation']
    else array['prises_de_vues_reelles'] end
where p.genre_slug is not null and p.postures is null and p.techniques is null;

-- Mots-clés de la posture et de la technique (source 'forme').
create or replace function public.forme_mots_cles() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  paire record;
  kid bigint;
begin
  for paire in
    select * from (values
      ('documentaire', 'documentaire', coalesce('documentaire' = any (new.postures), false)),
      ('animation', 'animation', coalesce('animation' = any (new.techniques), false)),
      ('contenu_ia', 'contenu IA', coalesce('contenu_ia' = any (new.techniques), false))
    ) v(slug, label, present)
  loop
    if paire.present then
      insert into public.keywords (slug, label_fr) values (paire.slug, paire.label) on conflict (slug) do nothing;
      select id into kid from public.keywords where slug = paire.slug;
      insert into public.project_keywords (project_id, keyword_id, source)
      values (new.id, kid, 'forme')
      on conflict (project_id, keyword_id) do update set source = 'forme'
        where public.project_keywords.source is null or public.project_keywords.source in ('ia', 'sous_genre');
    else
      delete from public.project_keywords pk using public.keywords k
       where k.slug = paire.slug and pk.keyword_id = k.id and pk.project_id = new.id and pk.source = 'forme';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists forme_mots_cles on public.projects;
create trigger forme_mots_cles after insert or update of postures, techniques on public.projects
  for each row execute function public.forme_mots_cles();

-- Animation et documentaire ne sont plus des sous-genres. Le mot-clé posé
-- par le sous-genre est d'abord passé en 'forme' quand la fiche le garde,
-- pour que la suppression ci-dessous ne l'emporte pas.
update public.project_keywords pk set source = 'forme'
from public.keywords k, public.projects p
where pk.keyword_id = k.id and pk.project_id = p.id and pk.source = 'sous_genre'
  and ((k.slug = 'documentaire' and 'documentaire' = any (p.postures))
    or (k.slug = 'animation' and 'animation' = any (p.techniques)));

delete from public.sous_genres where slug in ('animation', 'documentaire');

-- Les autres mots « documentaire » / « animation » des fiches concernées
-- (posés par l'IA) passent aussi en 'forme'.
update public.project_keywords pk set source = 'forme'
from public.keywords k, public.projects p
where pk.keyword_id = k.id and pk.project_id = p.id and (pk.source is null or pk.source = 'ia')
  and ((k.slug = 'documentaire' and 'documentaire' = any (p.postures))
    or (k.slug = 'animation' and 'animation' = any (p.techniques)));
insert into public.project_keywords (project_id, keyword_id, source)
select p.id, k.id, 'forme'
from public.projects p join public.keywords k
  on (k.slug = 'documentaire' and 'documentaire' = any (p.postures))
  or (k.slug = 'animation' and 'animation' = any (p.techniques))
on conflict do nothing;

-- La fonction d'enregistrement des sous-genres reste la même (0231).
