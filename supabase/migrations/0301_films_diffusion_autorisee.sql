-- Films que Sarah a l'autorisation de diffuser (21/11/2026) : les sept films
-- du partenaire Artemondo (artemondo.org, distribution Hevadis Films)
-- rejoignent la base des films pour ressortir dans « Films proches » — but :
-- diffuser un long métrage aux thèmes proches du CinéCrush de la semaine.
-- La table accueille donc des films qui ne viennent pas du CNC (et demain
-- des films étrangers) : visa et année d'agrément deviennent facultatifs,
-- et `source` dit d'où vient la ligne. Les statistiques ne comptent que
-- les films du CNC. Administration seulement, comme le reste de la table.
alter table public.films_cnc alter column visa drop not null;
alter table public.films_cnc alter column annee_agrement drop not null;
alter table public.films_cnc add column if not exists source text not null default 'cnc';
alter table public.films_cnc add column if not exists diffusion_autorisee boolean not null default false;
alter table public.films_cnc add column if not exists partenaire text;
alter table public.films_cnc add column if not exists lien text;

-- Voleur d'histoire est déjà là (film agréé par le CNC) : on le marque.
update public.films_cnc
   set diffusion_autorisee = true, partenaire = 'Artemondo', lien = 'https://artemondo.org/voleur-dhistoire/'
 where titre_normalise = 'voleur d histoire' and realisateur ilike 'ANDREI%';

-- Les six autres. Réalisateur et année ne sont écrits que là où la page du
-- film les donne sans ambiguïté : les fiches de La Maquisarde et d'Africaine
-- sont décalées sur le site, Le fils du désert n'en a pas — à compléter avec Sarah.
insert into public.films_cnc (titre, titre_affiche, titre_normalise, realisateur, genre, annee_sortie, resume, brut, source, diffusion_autorisee, partenaire, lien)
select v.titre, v.titre, v.norm, v.real, v.genre, v.annee, v.resume, '{}'::jsonb, 'artemondo', true, 'Artemondo', v.lien
  from (values
    ('Le fils du désert', 'fils du desert', null, 'fiction', null::smallint,
     'Mohamed a 17 ans, fils unique de mère marocaine et de père français, il mène une vie de lycéen ordinaire en France. Mais un jour, alors qu’il est en classe, on vient le chercher : ses parents ont eu un grave accident de voiture, ils sont décédés. Déboussolé, Mohamed est alors pris en charge par les services sociaux qui le conduisent dans un foyer d’accueil pour jeunes… Mohamed est un adolescent adopté que sa famille paternelle ne souhaite pas recueillir. Ses parents naturels, qui vivent dans le sud du Maroc, sont en fait son oncle et sa tante. La pratique est courante en ces terres : la mère de Mohamed, ne pouvant pas avoir d’enfant, a adopté le deuxième fils de sa sœur. À l’annonce de cette nouvelle le garçon est sous le choc. Il connaît son oncle et sa tante puisqu’il a passé quelques semaines en vacances dans leur petit village du Sahara. Après l’enterrement de ses parents, Mohamed fugue du foyer des services sociaux pour rejoindre sa famille au Maroc.',
     'https://artemondo.org/le-fils-du-desert/'),
    ('La Maquisarde', 'maquisarde', null, 'fiction', null,
     'Algérie. 1956. Plongée dans une guerre qui ne dit pas son nom, une jeune paysanne devient, malgré elle, une maquisarde. Mais lors d’une attaque, elle se fait capturer par un groupe de commandos qui la conduit dans un lieu d’interrogatoire interdit, où elle est enfermée avec une ancienne résistante française…',
     'https://artemondo.org/la-maquisarde/'),
    ('Navajo Songline', 'navajo songline', 'VIENNE Bruno, GARCIA Lorenza', 'documentaire', 2019,
     'À la demande des Frères Navajo, ce film vous invite à la rencontre des Diné, le Peuple, en langue Navajo. Laissez-vous embarquer dans un incroyable voyage initiatique au cœur de la culture et de la philosophie d’une tribu hors du commun… Lorenza, musicienne et chanteuse française, les côtoie depuis plus de 20 ans ; ce film vous emmène à la croisée d’une double réalité : celle des chants, des rituels, et des paysages désertiques et sauvages, et celle de la face obscure faite d’une surexploitation des ressources, d’une lutte pour la reconnaissance et la survie.',
     'https://artemondo.org/navajo-songline/'),
    ('Africaine', 'africaine', null, 'fiction', null,
     'Lors d’une visite à ses parents installés depuis peu en Afrique, Géraldine, 27 ans, doit replonger dans son enfance et affronter de vieilles rivalités avec sa sœur aînée, Alice, qui la martyrisait quand elle était petite. Au Sénégal, elle découvre l’âme africaine, la magie, les croyances et les coutumes et, peu à peu, s’en sert pour renverser sa situation de cadette et prendre l’ascendant sur Alice.',
     'https://artemondo.org/africaine/'),
    ('Dakar, ta nostalgie', 'dakar ta nostalgie', 'ARRIGONI NERI Florence', 'documentaire', 2016,
     'Terrible réalité : au Sénégal l’espérance de vie est de 62 ans pour les hommes, 66 ans pour les femmes. Se faire soigner coûte cher ; faute de moyens, les Sénégalais ne vont que très rarement consulter un médecin et, quand ils le font, il est souvent trop tard. Le film est une plongée intimiste au cœur de Dakar, au plus près des gens et des émotions. Florence Arrigoni partage son regard sur Dakar et ses amis ; ils expriment ici la difficulté de la vie en Afrique, et ce qu’ils possèdent d’essentiel : l’humanité, la solidarité, l’hospitalité. Hommage aux disparus, hommage aux vivants : au premier rang ses amis sénégalais, dont Maktar Ndiaye, dit Dada, clown-marionnettiste depuis 20 ans, qui se donne pour mission de transmettre du bonheur aux enfants.',
     'https://artemondo.org/dakar-ta-nostalgie/'),
    ('Beirut Intersections', 'beirut intersections', 'SABA Lara', 'fiction', 2015,
     'Trois personnages, trois milieux sociaux différents et trois destins qui se rencontrent au détour d’un tragique carrefour. Tout commence sur une longue route déserte. Un couple cinquantenaire roule dans une vieille voiture. Leur destin se noue à ceux des personnages du film, issus de milieux sociaux différents, allant de la misère à la richesse : Nour, la fille du couple ; Malek, homme d’affaires aisé, et sa femme India ; l’enfant prématurément mûr Marwan, qui vit avec sa mère alcoolique, perdue, désespérée, violente… Toutes ces vies, et bien d’autres, renversées par une réaction en chaîne des actions des autres.',
     'https://artemondo.org/beirut-intersections/')
  ) as v(titre, norm, real, genre, annee, resume, lien)
 where not exists (select 1 from public.films_cnc f where f.source = 'artemondo' and f.titre = v.titre);

-- Leurs mots-clés, écrits avec les consignes des films (scripts/mots-cles-consignes-films.md).
insert into public.films_cnc_mots_cles (film_id, mot)
select f.id, m
  from (values
    ('Le fils du désert', array['adolescence','deuil','adoption','fugue','Maroc','Sahara','orphelin','quête identitaire','secret de famille','foyer d''accueil','village','double culture']),
    ('La Maquisarde', array['guerre d''Algérie','Algérie','années 50','maquis','paysanne','résistante','huis clos','interrogatoire','captivité','femme','drame historique']),
    ('Navajo Songline', array['documentaire','Navajo','amérindien','peuple autochtone','voyage initiatique','chant','rituel','désert','États-Unis','spiritualité','exploitation des ressources','survie']),
    ('Africaine', array['sœur','rivalité','Sénégal','Afrique','enfance','famille','magie','croyance','coutume','cadette','revanche']),
    ('Dakar, ta nostalgie', array['documentaire','Dakar','Sénégal','Afrique','pauvreté','accès aux soins','mort','amitié','solidarité','hommage','clown']),
    ('Beirut Intersections', array['Beyrouth','Liban','film choral','destins croisés','classes sociales','accident','enfance','mère alcoolique','pauvreté','drame'])
  ) as v(titre, mots)
  join public.films_cnc f on f.source = 'artemondo' and f.titre = v.titre
  cross join unnest(v.mots) m
on conflict do nothing;

-- Les statistiques ne comptent que les films du CNC.
create or replace function public.statistiques_thematiques_films()
returns table (annee int, total int, mot text, nb int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'réservé à l''administration';
  end if;
  return query
  with formes as materialized (select * from mots_cles_formes_retenues()),
  retenus as (
    select f.id, coalesce(f.annee_sortie, f.annee_agrement)::int as an
      from films_cnc f
     where f.source = 'cnc'
       and exists (select 1 from films_cnc_mots_cles m where m.film_id = f.id)
  ),
  mots as (
    select distinct m.film_id, coalesce(fr.retenue, lower(m.mot)) as mot
      from films_cnc_mots_cles m left join formes fr on fr.forme = lower(m.mot)
  ),
  totaux as (select r.an, count(*)::int as n from retenus r group by r.an)
  select r.an, t.n, m.mot, count(*)::int
    from retenus r
    join mots m on m.film_id = r.id
    join totaux t on t.an = r.an
   group by r.an, t.n, m.mot
  having count(*) >= 2
   order by r.an, count(*) desc;
end;
$$;

-- Films proches : les films à diffusion autorisée viennent en tête (ils sont
-- peu nombreux), avec leur partenaire et le lien de leur page ; la page les
-- montre à part, pour ne pas faire croire qu'ils sont les plus proches.
drop function if exists public.films_proches(uuid, text[], int);
create or replace function public.films_proches(
  p_project uuid default null,
  p_mots text[] default null,
  p_limite int default 30
)
returns table (
  film_id bigint, titre text, annee int, realisateur text, genre text,
  tmdb_id int, resume text, score real, mots_communs text[], mots_film text[],
  diffusion_autorisee boolean, partenaire text, lien text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'réservé à l''administration';
  end if;
  return query
  with demandes as (
    -- les mots cherchés : clé, mots de la clé, et s'ils ont été tapés à la main
    select d.cle, regexp_split_to_array(d.cle, '[^[:alnum:]]+') as mots, bool_or(d.tape) as tape
      from (
        select cle_singulier(k.label_fr) as cle, false as tape
          from project_keywords pk join keywords k on k.id = pk.keyword_id
         where pk.project_id = p_project
        union all
        select cle_singulier(btrim(m)), true
          from unnest(coalesce(p_mots, '{}')) m
         where length(btrim(m)) >= 2
      ) d
     group by d.cle
  ),
  frequences as (select m.cle, count(distinct m.film_id) as n from films_cnc_mots_cles m group by m.cle),
  nb as (select count(distinct m.film_id)::real as n from films_cnc_mots_cles m),
  rarete as (
    -- la rareté d'un mot cherché : celle de sa clé parmi les films
    select d.cle, d.mots, d.tape, power(ln(nb.n / (1 + coalesce(fq.n, 0))), 2)::real as poids
      from demandes d cross join nb left join frequences fq on fq.cle = d.cle
  ),
  touches as (
    -- le même mot
    select m.film_id, d.cle as demande, m.mot, d.poids
      from rarete d join films_cnc_mots_cles m on m.cle = d.cle
    union all
    -- le mot du film contient le mot cherché
    select m.film_id, d.cle, m.mot, 0.5 * d.poids
      from rarete d join films_cnc_mots_cles m on m.cle_mots @> d.mots and m.cle <> d.cle
    union all
    -- le mot cherché contient le mot du film : c'est la rareté du mot du film qui compte
    select m.film_id, d.cle, m.mot, 0.5 * power(ln(nb.n / (1 + fq.n)), 2)::real
      from rarete d cross join nb
      join films_cnc_mots_cles m on m.cle_mots <@ d.mots and m.cle <> d.cle and length(m.cle) >= 4
      join frequences fq on fq.cle = m.cle
    union all
    -- un thème tapé à la main, lu dans le résumé
    select f.id, d.cle, d.cle, 0.5 * d.poids
      from rarete d join films_cnc f on d.tape and f.resume_mots @> d.mots
  ),
  par_demande as (
    select distinct on (t.film_id, t.demande) t.film_id, t.demande, t.mot, t.poids
      from touches t
     order by t.film_id, t.demande, t.poids desc
  ),
  scores as (
    select p.film_id, sum(p.poids)::real as score,
           (array_agg(p.mot order by p.poids desc)) as communs
      from par_demande p
     group by p.film_id
  )
  select f.id, coalesce(f.titre_affiche, f.titre), coalesce(f.annee_sortie, f.annee_agrement)::int,
         f.realisateur, f.genre, f.tmdb_id, f.resume, s.score, s.communs,
         (select array_agg(m.mot order by m.mot) from films_cnc_mots_cles m where m.film_id = f.id),
         f.diffusion_autorisee, f.partenaire, f.lien
    from scores s
    join films_cnc f on f.id = s.film_id
   order by f.diffusion_autorisee desc, s.score desc, f.id
   limit greatest(1, least(coalesce(p_limite, 30), 100));
end;
$$;

revoke all on function public.films_proches(uuid, text[], int) from public, anon;
grant execute on function public.films_proches(uuid, text[], int) to authenticated;
