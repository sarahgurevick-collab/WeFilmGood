// Réimportation finale de WFG 1 dans WFG 2 (bascule du 10/11/2026).
//
// Règle unique (Sarah, 24/09 et 18/10/2026) : on AJOUTE ce qui est nouveau
// sur WFG 1, on ne touche jamais à ce qui existe sur WFG 2. Pour une fiche
// ou un profil déjà repris, on complète seulement les champs vides, et
// seulement quand WFG 1 a changé entre les deux copies. Rien n'est
// supprimé, rien n'est écrasé.
//
// Trois schémas de la base :
//   - public      : WFG 2 (la base vivante) ;
//   - wfg1_final  : la copie finale de WFG 1 (chargée par charger-dump-wfg1.mjs) — la SOURCE ;
//   - wfg1        : la copie de septembre, celle qui a servi au premier
//                   import — la RÉFÉRENCE. Ce qui est dans la référence mais
//                   absent de WFG 2 a été écarté, supprimé ou fusionné
//                   exprès sur WFG 2 : on ne le ramène pas.
//
// Ce qui est repris : comptes et profils (validation, catégorie, langues,
// métiers, témoignage, portrait chinois), projets (fiche, format, genre,
// sous-genres, pays, budget, public, bandeau, videopitch), personnages,
// mots-clés de WFG 1 (familles 2-6, sélections 7, comédiens 8, codes
// abîmés), équipes, fiches de lecture, anciens messages.
// Hors de ce script : les images et documents (importer-images-wfg1.mjs,
// importer-docs-wfg1.mjs), les profils des équipiers sans compte
// (creer-profils-equipes-wfg1.mjs), les accents (corriger-accents.mjs).
//
// Lancement :
//   node scripts/reimporter-wfg1.mjs --essai                      → rapport seul, transaction annulée (rien n'est écrit)
//   node scripts/reimporter-wfg1.mjs --appliquer                  → pour de vrai, en une transaction, après sauvegarde JSON
//   options : --source wfg1_final  --reference wfg1  --sans-reference  --dossier ~/imports
//
// En essai, tout est réellement joué dans la base (déclencheurs compris),
// puis annulé par ROLLBACK : le rapport dit ce qui se passerait.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
function option(nom, defaut) {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : defaut;
}
const APPLIQUER = args.includes("--appliquer");
const S = option("--source", "wfg1_final");
const R = args.includes("--sans-reference") ? null : option("--reference", "wfg1");
const DOSSIER = option("--dossier", join(homedir(), "imports"));
const MODE = APPLIQUER ? "applique" : "essai";

for (const nom of [S, R].filter(Boolean)) {
  if (!/^[a-z_][a-z0-9_]*$/.test(nom) || ["public", "auth", "storage"].includes(nom)) {
    console.error(`Nom de schéma refusé : ${nom}`);
    process.exit(1);
  }
}
if (APPLIQUER && R === S) {
  console.error("La source et la référence sont le même schéma : rien à ajouter. (--appliquer refusé)");
  process.exit(1);
}

const PSQL = ["exec", "-i", "supabase-db", "psql", "-U", "postgres", "-X", "-q", "-At", "-F", "\t", "-v", "ON_ERROR_STOP=1"];

// ---------------------------------------------------------------------
// Vérifications avant de commencer
// ---------------------------------------------------------------------
function sqlSimple(texte) {
  return new Promise((resoudre, rejeter) => {
    const p = spawn("docker", PSQL, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resoudre(out.trim()) : rejeter(new Error(err.trim()))));
    p.stdin.end(texte);
  });
}
const TABLES_REQUISES = ["accounts", "projects", "characters_sheet", "people_linked", "co_authors", "keywords", "user_data", "projects_review", "testimonials", "chat"];
for (const schema of [S, R].filter(Boolean)) {
  const presentes = (await sqlSimple(`select string_agg(table_name, ',') from information_schema.tables where table_schema = '${schema}'`)).split(",").filter(Boolean);
  const manquantes = TABLES_REQUISES.filter((t) => !presentes.includes(t));
  if (manquantes.length) {
    console.error(`Le schéma ${schema} n'a pas les tables : ${manquantes.join(", ")}.` + (schema === S ? ` Charger d'abord le dump : node scripts/charger-dump-wfg1.mjs --dump … --schema ${S}` : ""));
    process.exit(1);
  }
}

// ---------------------------------------------------------------------
// Le SQL. Tout se passe dans une transaction : BEGIN … (analyse) …
// (application) … COMMIT ou ROLLBACK. Le rapport sort ligne à ligne sous
// la forme « section<TAB>json ».
// ---------------------------------------------------------------------
const ref = (table) => (R ? `select * from "${R}".${table}` : `select * from "${S}".${table} where false`);
const EMAIL_VALIDE = String.raw`'^[^@\s]+@[^@\s]+\.[a-z]{2,}$'`;

const SQL_PREPARATION = String.raw`
begin;
set local statement_timeout = 0;
set local lock_timeout = '20s';
set local search_path = public, extensions;

-- La référence (copie de septembre), en tables temporaires pour avoir le
-- même SQL avec ou sans référence.
create temporary table ref_accounts on commit drop as ${ref("accounts")};
create temporary table ref_projects on commit drop as ${ref("projects")};
create temporary table ref_characters_sheet on commit drop as ${ref("characters_sheet")};
create temporary table ref_people_linked on commit drop as ${ref("people_linked")};
create temporary table ref_co_authors on commit drop as ${ref("co_authors")};
create temporary table ref_projects_review on commit drop as ${ref("projects_review")};
create temporary table ref_chat on commit drop as ${ref("chat")};
create temporary table ref_user_data on commit drop as ${ref("user_data")};
create temporary table ref_testimonials on commit drop as ${ref("testimonials")};
create index on ref_accounts (user_id);
create index on ref_projects (project_id);
create index on ref_characters_sheet (character_id);
create index on ref_people_linked (link_id);
create index on ref_co_authors (project_id);
create index on ref_projects_review (review_id);
create index on ref_chat (chat_id);
create index on ref_user_data (user_id);
create index on ref_testimonials (user_id);

-- La source : copies de travail des tables lues plusieurs fois.
create temporary table src_user_data on commit drop as select * from "${S}".user_data;
create index on src_user_data (user_id);

create temporary table journal (etape text, n bigint) on commit drop;

-- Petites fonctions de correspondance WFG 1 → WFG 2 (dans pg_temp : elles
-- disparaissent avec la session).
create function pg_temp.date_paris(t text) returns timestamptz language sql immutable as $$
  select case when t ~ '^\d{4}-\d{2}-\d{2}' and t !~ '^0000' then (t::timestamp at time zone 'Europe/Paris') end;
$$;
create function pg_temp.categorie(role text) returns text language sql immutable as $$
  select case role
    when 'producer' then 'producteur'
    when 'author' then 'auteur' when 'novelist' then 'auteur' when 'theater' then 'auteur' when 'comicbook' then 'auteur'
    when 'director' then 'talent' when 'actor' then 'talent' when 'composer' then 'talent' when 'photodirector' then 'talent'
    when 'editor' then 'talent' when 'animator2d3d' then 'talent' when 'soundengineer' then 'talent' when 'hdecorator' then 'talent'
    when 'sfxcreator' then 'talent' end;
$$;
create function pg_temp.metier_role(role text) returns text language sql immutable as $$
  select case role
    when 'author' then 'scenariste' when 'producer' then 'producteur' when 'director' then 'realisateur'
    when 'actor' then 'comedien' when 'novelist' then 'romancier' when 'composer' then 'compositeur'
    when 'photodirector' then 'directeur_photo' when 'editor' then 'monteur' when 'theater' then 'auteur_theatre'
    when 'comicbook' then 'auteur_bd' when 'animator2d3d' then 'animateur_2d_3d' when 'soundengineer' then 'sound_designer'
    when 'hdecorator' then 'chef_decorateur' when 'sfxcreator' then 'sfx_digitaux' end;
$$;
create function pg_temp.metier_code(code text) returns text language sql immutable as $$
  select case code
    when '4' then 'directeur_photo' when '5' then 'comedien' when '6' then 'compositeur' when '7' then 'sound_designer'
    when '8' then 'monteur' when '9' then 'producteur' when '10' then 'realisateur' when '12' then 'scenariste'
    when '16' then 'auteur_bd' when '17' then 'romancier' when '18' then 'auteur_theatre' when '19' then 'chef_decorateur'
    when '20' then 'sfx_digitaux' when '21' then 'animateur_2d_3d' end;
$$;
create function pg_temp.format_wfg1(code int, duree text) returns text language sql immutable as $$
  select coalesce(
    case code when 0 then 'long_metrage' when 1 then 'court_metrage' when 2 then 'long_metrage' when 3 then 'serie'
              when 4 then 'serie' when 6 then 'immersif_360_vr' end,
    case upper(btrim(duree)) when 'LM' then 'long_metrage' when 'CM' then 'court_metrage' when 'TV' then 'serie' end);
$$;
create function pg_temp.budget_wfg1(b bigint) returns text language sql immutable as $$
  select case b when 0 then 'petit' when 1 then 'milieu' when 2 then 'milieu' when 3 then 'milieu' when 4 then 'gros' end;
$$;
create function pg_temp.audience_wfg1(a bigint) returns text language sql immutable as $$
  select case a when 0 then 'jeune_public' when 1 then 'jeunes_adultes' when 2 then 'adultes' when 3 then 'adultes' when 4 then 'tous_publics' end;
$$;
create function pg_temp.slug(t text) returns text language sql immutable as $$
  select btrim(regexp_replace(lower(public.sans_accent(btrim(t))), '[^a-z0-9]+', '_', 'g'), '_');
$$;

-- Le dictionnaire des mots-clés de WFG 1 (un libellé par code : le plus ancien).
create temporary table dico on commit drop as
  select distinct on (category, keyword) category, keyword, btrim(fr) as fr, pg_temp.slug(fr) as slug
  from "${S}".keywords where coalesce(btrim(fr), '') <> ''
  order by category, keyword, keyword_id;

-- Genres WFG 1 (famille 1) → familles WFG 2 (migrations 0061 et 0231).
create temporary table familles_wfg1 (code int, famille text) on commit drop;
insert into familles_wfg1 values
  (6,'drame'),(21,'drame'),(20,'drame'),(22,'drame'),(7,'drame'),(8,'drame'),(34,'drame'),(37,'drame'),
  (4,'comedie'),(16,'comedie'),(13,'comedie'),
  (11,'recit_speculatif'),(17,'recit_speculatif'),(9,'recit_speculatif'),(23,'recit_speculatif'),(24,'recit_speculatif'),(28,'recit_speculatif'),
  (18,'recit_criminel'),(10,'recit_criminel'),(29,'recit_criminel'),
  (1,'aventure'),(0,'aventure'),(15,'aventure'),(12,'aventure'),(36,'aventure'),
  (19,'recit_historique'),(33,'recit_historique'),(32,'recit_historique'),(35,'recit_historique'),(30,'recit_historique'),
  (14,'film_musical'),(25,'film_musical'),(31,'film_musical');

-- Codes WFG 1 → sous-genres WFG 2 (migration 0231).
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

-- Questions du portrait chinois (migration 0047).
create temporary table questions_portrait (nom text, cle text) on commit drop;
insert into questions_portrait values
  ('q_cinema','cinema'),('q_movie','film_nationalite'),('q_prefered','film_prefere'),('q_tv_show','serie'),
  ('q_char','personnage_film'),('q_prod','producteur'),('q_drama','piece_theatre'),('q_music','musique'),
  ('q_instrument','instrument'),('q_painter','peintre'),('q_event','evenement_historique'),('q_city','ville'),
  ('q_sport','sport'),('q_sense','sens'),('q_liquor','alcool'),('q_meal','plat'),('q_ideal_host','diner_ideal'),
  ('q_book','livre'),('q_actor','acteur'),('q_actress','actrice');

-- Agrégats par compte dans user_data (validation, portrait, langues).
create temporary table src_ud on commit drop as
  select user_id,
    bool_or(name like 'legit\_%' and value = '1') as valide,
    jsonb_object_agg(name, btrim(value)) filter (where name like 'q\_%' and nullif(btrim(value), '') is not null) as portrait,
    string_agg(value, '|' order by name) filter (where name in ('spoken_languages', 'written_languages')) as langues
  from src_user_data group by user_id;
create temporary table ref_ud on commit drop as
  select user_id,
    bool_or(name like 'legit\_%' and value = '1') as valide,
    jsonb_object_agg(name, btrim(value)) filter (where name like 'q\_%' and nullif(btrim(value), '') is not null) as portrait,
    string_agg(value, '|' order by name) filter (where name in ('spoken_languages', 'written_languages')) as langues
  from ref_user_data group by user_id;

-- =====================================================================
-- 1. Les comptes
-- =====================================================================
create temporary table comptes on commit drop as
with a as (
  select s.user_id, lower(btrim(s.email)) as email, s.role,
         nullif(btrim(s.first_name), '') as prenom, nullif(btrim(s.last_name), '') as nom,
         s.registration_date, (r.user_id is not null) as dans_ref
  from "${S}".accounts s left join ref_accounts r on r.user_id = s.user_id
),
b as (
  select a.*, p.id as profil_id,
    case
      when a.role in ('reader', 'admin') then 'lecteur ou administrateur de WFG 1 : jamais repris'
      when a.prenom = 'Dg54asdkfoda+-' or a.nom = 'Dg54asdkfoda+-' then 'faux compte de l''attaque de juin 2026'
      when a.user_id in (3866, 8144, 10560, 10563, 10576, 4627, 1009) then 'compte exclu par Sarah (banni ou doublon)'
      when exists (select 1 from public.membres_supprimes m where m.legacy_user_id = a.user_id or lower(m.email) = a.email) then 'supprimé depuis l''écran des membres (membres_supprimes)'
      when a.email in ('noyes.fr@gmail.com', 'sarah23.fr@gmail.com') then 'adresse de garage'
      when a.email !~ ${EMAIL_VALIDE} then 'adresse e-mail invalide'
    end as exclusion
  from a left join public.profiles p on p.legacy_id = a.user_id::text
)
select b.*,
  case
    when b.profil_id is not null then null
    when b.exclusion is not null then b.exclusion
    when b.dans_ref then 'dans la copie de septembre mais écarté alors : laissé de côté'
    when exists (select 1 from auth.users u where lower(u.email) = b.email) then 'adresse déjà utilisée par un autre compte WFG 2'
    when exists (select 1 from b b2 where b2.email = b.email and b2.user_id <> b.user_id and b2.exclusion is null and b2.profil_id is null) then 'adresse partagée par plusieurs nouveaux comptes WFG 1'
  end as motif
from b;
alter table comptes add column a_creer boolean;
update comptes set a_creer = (profil_id is null and motif is null);
create index on comptes (user_id);

select 'comptes_nouveaux', row_to_json(x)::text from (
  select user_id, email, prenom, nom, role, registration_date from comptes where a_creer order by user_id) x;
select 'comptes_ecartes', row_to_json(x)::text from (
  select motif, count(*) as n from comptes where profil_id is null and not a_creer group by motif order by n desc) x;
select 'comptes_ecartes_detail', row_to_json(x)::text from (
  select user_id, email, prenom, nom, role, motif from comptes
  where motif in ('adresse déjà utilisée par un autre compte WFG 2', 'adresse partagée par plusieurs nouveaux comptes WFG 1')
  order by motif, user_id) x;

-- Création : un compte de connexion (adresse confirmée, aucun e-mail
-- envoyé ; la personne reçoit son lien magique le jour où elle se
-- connecte), comme importer-comptes-wfg1.mjs. Le déclencheur
-- on_auth_user_created crée le profil, z_rattacher_equipes le relie aux
-- équipes qui attendaient son adresse.
create temporary table comptes_crees on commit drop as
with ins as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change, is_sso_user, is_anonymous)
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', c.email,
         extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf', 10)), now(),
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         jsonb_strip_nulls(jsonb_build_object(
           'legacy_id', c.user_id::text, 'imported_from', 'ancienne_plateforme', 'email_verified', true,
           'full_name', nullif(concat_ws(' ', c.prenom, c.nom), ''), 'first_name', c.prenom, 'last_name', c.nom)),
         now(), now(), '', '', '', '', false, false
  from comptes c where c.a_creer
  returning id, email, (raw_user_meta_data ->> 'legacy_id')::bigint as user_id
)
select * from ins;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select c.id::text, c.id,
       jsonb_build_object('sub', c.id::text, 'email', c.email, 'email_verified', false, 'phone_verified', false),
       'email', now(), now()
from comptes_crees c;
update public.profiles p
   set legacy_id = c.user_id::text, legacy_user_id = c.user_id,
       created_at = coalesce(pg_temp.date_paris(k.registration_date), p.created_at)
  from comptes_crees c join comptes k on k.user_id = c.user_id
 where p.id = c.id;
insert into journal values ('comptes créés', (select count(*) from comptes_crees));

-- =====================================================================
-- 2. Les profils : compléter les champs vides (nouveaux comptes compris)
-- =====================================================================
create temporary table profils on commit drop as
select p.id, p.legacy_id, s.user_id, (c.user_id is not null) as nouveau, (r.user_id is not null) as dans_ref,
  lower(btrim(s.email)) as email,
  nullif(btrim(s.first_name), '') as s_prenom, nullif(btrim(r.first_name), '') as r_prenom, nullif(btrim(p.first_name), '') as p_prenom,
  nullif(btrim(s.last_name), '') as s_nom, nullif(btrim(r.last_name), '') as r_nom, nullif(btrim(p.last_name), '') as p_nom,
  nullif(btrim(p.full_name), '') as p_full,
  nullif(btrim(s.city), '') as s_ville, nullif(btrim(r.city), '') as r_ville, nullif(btrim(p.city), '') as p_ville,
  nullif(btrim(s.country), '') as s_pays, nullif(btrim(r.country), '') as r_pays, nullif(btrim(p.country), '') as p_pays,
  coalesce(nullif(btrim(s.biofilmo_fr), ''), nullif(btrim(s.biofilmo_en), '')) as s_bio,
  coalesce(nullif(btrim(r.biofilmo_fr), ''), nullif(btrim(r.biofilmo_en), '')) as r_bio,
  nullif(btrim(p.biofilmo), '') as p_bio,
  s.role as s_role, r.role as r_role, p.category::text as p_cat,
  s.job as s_job, r.job as r_job,
  coalesce(su.valide, false) as s_valide, coalesce(ru.valide, false) as r_valide, p.validation_status::text as p_valid,
  (select btrim(t.testimony) from "${S}".testimonials t
     where t.user_id = s.user_id and t.moderation = 1 and nullif(btrim(t.testimony), '') is not null
     order by t.date desc limit 1) as s_temoin,
  (select btrim(t.testimony) from ref_testimonials t
     where t.user_id = s.user_id and t.moderation = 1 and nullif(btrim(t.testimony), '') is not null
     order by t.date desc limit 1) as r_temoin,
  nullif(btrim(p.testimonial), '') as p_temoin,
  su.portrait as s_portrait_brut, ru.portrait as r_portrait_brut,
  (p.personality_answers is null or p.personality_answers = '{}'::jsonb) as p_portrait_vide,
  su.langues as s_langues, ru.langues as r_langues,
  p.legacy_user_id
from public.profiles p
join "${S}".accounts s on s.user_id::text = p.legacy_id
left join ref_accounts r on r.user_id = s.user_id
left join comptes_crees c on c.user_id = s.user_id
left join src_ud su on su.user_id = s.user_id
left join ref_ud ru on ru.user_id = s.user_id;
create index on profils (user_id);

-- Le portrait chinois, pour les seuls profils concernés (coûteux).
create temporary table portraits on commit drop as
select pr.id,
  (select jsonb_object_agg(q.cle, coalesce(public.rattacher_reponse_portrait(q.cle, v.value), 'autre:' || v.value))
     from jsonb_each_text(pr.s_portrait_brut) v join questions_portrait q on q.nom = v.key) as portrait
from profils pr
where pr.p_portrait_vide and pr.s_portrait_brut is not null
  and (pr.nouveau or pr.s_portrait_brut is distinct from pr.r_portrait_brut);

create temporary table profils_complements on commit drop as
select pr.id, pr.legacy_id, pr.email, pr.nouveau, v.champ, v.valeur
from profils pr
left join portraits po on po.id = pr.id,
lateral (values
  ('first_name', case when pr.p_prenom is null and pr.s_prenom is not null and (pr.nouveau or pr.s_prenom is distinct from pr.r_prenom) then pr.s_prenom end),
  ('last_name',  case when pr.p_nom is null and pr.s_nom is not null and (pr.nouveau or pr.s_nom is distinct from pr.r_nom) then pr.s_nom end),
  ('full_name',  case when pr.p_full is null and (pr.s_prenom is not null or pr.s_nom is not null)
                      and (pr.nouveau or (pr.s_prenom, pr.s_nom) is distinct from (pr.r_prenom, pr.r_nom)) then concat_ws(' ', pr.s_prenom, pr.s_nom) end),
  ('city',       case when pr.p_ville is null and pr.s_ville is not null and (pr.nouveau or pr.s_ville is distinct from pr.r_ville) then pr.s_ville end),
  ('country',    case when pr.p_pays is null and pr.s_pays is not null and (pr.nouveau or pr.s_pays is distinct from pr.r_pays) then pr.s_pays end),
  ('biofilmo',   case when pr.p_bio is null and pr.s_bio is not null and (pr.nouveau or pr.s_bio is distinct from pr.r_bio) then pr.s_bio end),
  ('category',   case when pr.p_cat is null and pg_temp.categorie(pr.s_role) is not null and (pr.nouveau or pr.s_role is distinct from pr.r_role) then pg_temp.categorie(pr.s_role) end),
  ('validation_status', case when pr.p_valid in ('non_requise', 'en_attente') and pr.s_valide and (pr.nouveau or not pr.r_valide) then 'validee' end),
  ('testimonial', case when pr.p_temoin is null and pr.s_temoin is not null and (pr.nouveau or pr.s_temoin is distinct from pr.r_temoin) then pr.s_temoin end),
  ('personality_answers', po.portrait::text)
) v(champ, valeur)
where v.valeur is not null;

create temporary table langues_a_ajouter on commit drop as
select distinct pr.id, pr.legacy_id, pr.email, l.code
from profils pr
join src_user_data d on d.user_id = pr.user_id and d.name in ('spoken_languages', 'written_languages')
cross join lateral (select case x when 'cn' then 'zh' when 'jp' then 'ja' else x end as code from unnest(string_to_array(d.value, '|')) x) l
join public.languages g on g.code = l.code
where (pr.nouveau or pr.s_langues is distinct from pr.r_langues)
  and not exists (select 1 from public.profile_languages pl where pl.profile_id = pr.id and pl.language_code = l.code);

create temporary table metiers_a_ajouter on commit drop as
select distinct pr.id, pr.legacy_id, pr.email, m.slug
from profils pr
cross join lateral (
  select pg_temp.metier_role(pr.s_role) as slug
  union select pg_temp.metier_code(c) from unnest(string_to_array(coalesce(pr.s_job, ''), '|')) c
) m
join public.roles ro on ro.slug = m.slug
where (pr.nouveau or pr.s_role is distinct from pr.r_role or pr.s_job is distinct from pr.r_job)
  and not exists (select 1 from public.profile_roles x where x.profile_id = pr.id and x.role_slug = m.slug);

-- Modifié sur WFG 1 entre les deux copies, alors que WFG 2 a déjà une
-- valeur : listé, jamais appliqué.
create temporary table profils_modifies on commit drop as
select pr.legacy_id, pr.email, v.champ, left(v.wfg2, 200) as wfg2, left(v.wfg1, 200) as wfg1, left(v.sept, 200) as septembre
from profils pr, lateral (values
  ('prénom', pr.p_prenom, pr.s_prenom, pr.r_prenom), ('nom', pr.p_nom, pr.s_nom, pr.r_nom),
  ('ville', pr.p_ville, pr.s_ville, pr.r_ville), ('pays', pr.p_pays, pr.s_pays, pr.r_pays),
  ('biographie', pr.p_bio, pr.s_bio, pr.r_bio), ('témoignage', pr.p_temoin, pr.s_temoin, pr.r_temoin),
  ('rôle WFG 1', pr.p_cat, pr.s_role, pr.r_role)
) v(champ, wfg2, wfg1, sept)
where not pr.nouveau and pr.dans_ref and v.wfg1 is distinct from v.sept and v.wfg2 is not null and v.wfg2 is distinct from v.wfg1;

select 'profils_complements', row_to_json(x)::text from (
  select legacy_id, email, nouveau, champ, left(valeur, 120) as valeur from profils_complements order by nouveau desc, legacy_id::bigint, champ) x;
select 'profils_langues', row_to_json(x)::text from (
  select legacy_id, email, string_agg(code, ', ' order by code) as langues from langues_a_ajouter group by 1, 2 order by legacy_id::bigint) x;
select 'profils_metiers', row_to_json(x)::text from (
  select legacy_id, email, string_agg(slug, ', ' order by slug) as metiers from metiers_a_ajouter group by 1, 2 order by legacy_id::bigint) x;
select 'profils_modifies', row_to_json(x)::text from (select * from profils_modifies order by legacy_id::bigint, champ) x;

-- =====================================================================
-- 3. Les projets
-- =====================================================================
create temporary table projets on commit drop as
select s.project_id, s.user_id, p.id as wfg2_id, (r.project_id is not null) as dans_ref,
  s.title as s_titre, s.title_en as s_titre_en, s.logline as s_logline, s.logline_en as s_logline_en,
  s.misc as s_misc, s.misc_en as s_misc_en, s.keywords as s_kw, s.character_keywords as s_ckw,
  s.status as s_status, s.labeled as s_label, s.budget as s_budget, s.target_audience as s_audience,
  s.language as s_langue, s.duration as s_duree, s.date as s_date, s.videopitchs as s_video, s.festival as s_festival, s.picture as s_image,
  r.title as r_titre, r.title_en as r_titre_en, r.logline as r_logline, r.logline_en as r_logline_en,
  r.misc as r_misc, r.misc_en as r_misc_en, r.keywords as r_kw, r.character_keywords as r_ckw,
  r.status as r_status, r.labeled as r_label, r.budget as r_budget, r.target_audience as r_audience,
  r.language as r_langue, r.duration as r_duree, r.videopitchs as r_video, r.festival as r_festival, r.picture as r_image,
  o.id as owner_id,
  case
    when p.id is not null then null
    when r.project_id is not null then 'dans la copie de septembre mais absent de WFG 2 (supprimé ou fusionné sur WFG 2 exprès) : laissé de côté'
    when o.id is null then 'auteur non repris : ' || coalesce(k.motif, 'compte WFG 1 n° ' || s.user_id || ' introuvable')
  end as motif
from "${S}".projects s
left join public.projects p on p.legacy_id = s.project_id::text
left join ref_projects r on r.project_id = s.project_id
left join public.profiles o on o.legacy_id = s.user_id::text
left join comptes k on k.user_id = s.user_id;
alter table projets add column a_creer boolean, add column mots_cles_changes boolean;
update projets set
  a_creer = (wfg2_id is null and motif is null),
  mots_cles_changes = (wfg2_id is null and motif is null)
                   or (wfg2_id is not null and (s_kw is distinct from r_kw or s_ckw is distinct from r_ckw));
create index on projets (project_id);

-- Les jetons de mots-clés (famille-numéro), fiche et personnages, y compris
-- les codes abîmés « f-nnF-n » décodés comme en 0229.
create temporary table jetons on commit drop as
with brut as (
  select pr.project_id, 'fiche' as origine, m.c[1]::int as famille, m.c[2]::int as numero, m.n as rang
  from projets pr, lateral regexp_matches(coalesce(pr.s_kw, ''), '\|(\d)-(\d+)(?=\|)', 'g') with ordinality as m(c, n)
  union all
  select pr.project_id, 'perso', m.c[1]::int, m.c[2]::int, m.n
  from projets pr, lateral regexp_matches(coalesce(pr.s_ckw, ''), '\|(\d)-(\d+)(?=\|)', 'g') with ordinality as m(c, n)
  union all
  select pr.project_id, 'fiche', m.c[1]::int, left(m.c[2], length(m.c[2]) - 1)::int, 1000 + m.n
  from projets pr, lateral regexp_matches(coalesce(pr.s_kw, ''), '\|(\d)-(\d{2,})-(\d+)(?=\|)', 'g') with ordinality as m(c, n)
  union all
  select pr.project_id, 'fiche', right(m.c[2], 1)::int, m.c[3]::int, 2000 + m.n
  from projets pr, lateral regexp_matches(coalesce(pr.s_kw, ''), '\|(\d)-(\d{2,})-(\d+)(?=\|)', 'g') with ordinality as m(c, n)
)
select b.*, d.fr, d.slug from brut b left join dico d on d.category = b.famille and d.keyword = b.numero;
create index on jetons (project_id);

-- Le genre (famille 1) : la première famille WFG 2 trouvée ; biopic,
-- animation, documentaire seuls → Drame, comme en 0231.
create temporary table genres_projets on commit drop as
select distinct on (j.project_id) j.project_id, coalesce(f.famille, 'drame') as famille, j.fr
from jetons j left join familles_wfg1 f on f.code = j.numero
where j.origine = 'fiche' and j.famille = 1 and j.fr is not null
order by j.project_id, (f.famille is null), j.rang;

create temporary table formats_projets on commit drop as
select pr.project_id, pg_temp.format_wfg1(
  (select j.numero from jetons j where j.project_id = pr.project_id and j.origine = 'fiche' and j.famille = 0 order by j.rang limit 1),
  pr.s_duree) as format
from projets pr;

create temporary table pays_projets on commit drop as
select distinct on (j.project_id) j.project_id, j.fr as pays
from jetons j where j.origine = 'fiche' and j.famille = 5 and j.numero <> 0 and j.fr is not null
order by j.project_id, j.rang;

select 'projets_nouveaux', row_to_json(x)::text from (
  select pr.project_id, pr.user_id, k.email as auteur_email, coalesce(nullif(btrim(pr.s_titre), ''), nullif(btrim(pr.s_titre_en), ''), '(sans titre)') as titre,
         pr.s_status as statut_wfg1, pr.s_date as date_wfg1, f.format, g.famille as genre, (k.a_creer) as auteur_nouveau
  from projets pr left join comptes k on k.user_id = pr.user_id
  left join formats_projets f on f.project_id = pr.project_id left join genres_projets g on g.project_id = pr.project_id
  where pr.a_creer order by pr.project_id) x;
select 'projets_ecartes', row_to_json(x)::text from (
  select motif, count(*) as n from projets where wfg2_id is null and not a_creer group by motif order by n desc) x;
select 'projets_ecartes_detail', row_to_json(x)::text from (
  select project_id, user_id, left(coalesce(nullif(btrim(s_titre), ''), s_titre_en), 60) as titre, s_status as statut_wfg1, motif
  from projets where wfg2_id is null and not a_creer order by project_id) x;

-- Création. Un court métrage n'a ni budget ni public visé sur WFG 2 (0095).
insert into public.projects (owner_id, title, logline, synopsis, format, genre_slug, genre_legacy, language, country,
                             status, is_public, created_at, updated_at, bandeau, has_awards, budget_range, target_audience,
                             legacy_id, postures, techniques)
select pr.owner_id,
  coalesce(nullif(btrim(pr.s_titre), ''), nullif(btrim(pr.s_titre_en), ''), '(sans titre)'),
  coalesce(nullif(btrim(pr.s_logline), ''), nullif(btrim(pr.s_logline_en), '')),
  coalesce(nullif(btrim(pr.s_misc), ''), nullif(btrim(pr.s_misc_en), '')),
  f.format::public.project_format,
  g.famille, g.fr,
  nullif(btrim(pr.s_langue), ''),
  py.pays,
  (case when pr.s_status = 9 then 'labellise' else 'depose' end)::public.project_status,
  true,
  coalesce(pg_temp.date_paris(pr.s_date), now()), coalesce(pg_temp.date_paris(pr.s_date), now()),
  case when pr.s_label between 1 and 5 then (array['optionne', 'signe', 'tourne', 'script_prime', 'film_prime'])[pr.s_label] end,
  coalesce(pr.s_festival in (1, 2), false),
  case when f.format = 'court_metrage' then null else pg_temp.budget_wfg1(pr.s_budget) end,
  case when f.format = 'court_metrage' then null else pg_temp.audience_wfg1(pr.s_audience) end,
  pr.project_id::text,
  case when g.famille is null then null
       when exists (select 1 from jetons j where j.project_id = pr.project_id and j.origine = 'fiche' and j.famille = 1 and j.numero = 5) or f.format = 'documentaire' then array['documentaire']
       else array['fiction'] end,
  case when g.famille is null then null
       when exists (select 1 from jetons j where j.project_id = pr.project_id and j.origine = 'fiche' and j.famille = 2 and j.numero = 56) then array['prises_de_vues_reelles', 'animation']
       when exists (select 1 from jetons j where j.project_id = pr.project_id and j.origine = 'fiche' and j.famille = 1 and j.numero in (2, 26)) then array['animation']
       else array['prises_de_vues_reelles'] end
from projets pr
left join formats_projets f on f.project_id = pr.project_id
left join genres_projets g on g.project_id = pr.project_id
left join pays_projets py on py.project_id = pr.project_id
where pr.a_creer;
insert into journal values ('projets créés', (select count(*) from projets where a_creer));
update projets pr set wfg2_id = p.id from public.projects p where pr.a_creer and p.legacy_id = pr.project_id::text;

-- Sous-genres des nouvelles fiches (trois au plus, famille respectée).
insert into public.project_sous_genres (project_id, sous_genre_slug, position)
select project_id, sous_genre, n from (
  select x.project_id, x.sous_genre, row_number() over (partition by x.project_id order by x.rang, x.sous_genre) as n
  from (
    select distinct on (pr.wfg2_id, c.sous_genre) pr.wfg2_id as project_id, c.sous_genre, j.rang
    from projets pr
    join public.projects p on p.id = pr.wfg2_id
    join jetons j on j.project_id = pr.project_id and j.origine = 'fiche'
    join codes_sous_genres c on c.code = j.famille || '-' || j.numero
    join public.sous_genres sg on sg.slug = c.sous_genre
    where pr.a_creer and p.genre_slug is not null and (sg.familles is null or p.genre_slug = any (sg.familles))
    order by pr.wfg2_id, c.sous_genre, j.rang
  ) x
) y where n <= 3
on conflict do nothing;

-- Compléments des fiches existantes : seulement si WFG 2 est vide ET que
-- WFG 1 a changé depuis septembre.
create temporary table projets_complements on commit drop as
select pr.project_id, pr.wfg2_id, p.title as titre_wfg2, v.champ, v.valeur
from projets pr
join public.projects p on p.id = pr.wfg2_id
left join formats_projets f on f.project_id = pr.project_id
left join genres_projets g on g.project_id = pr.project_id
left join pays_projets py on py.project_id = pr.project_id,
lateral (values
  ('title', case when (nullif(btrim(p.title), '') is null or p.title = '(sans titre)')
                  and coalesce(nullif(btrim(pr.s_titre), ''), nullif(btrim(pr.s_titre_en), '')) is not null
                  and (not pr.dans_ref or (pr.s_titre, pr.s_titre_en) is distinct from (pr.r_titre, pr.r_titre_en))
                 then coalesce(nullif(btrim(pr.s_titre), ''), nullif(btrim(pr.s_titre_en), '')) end),
  ('logline', case when nullif(btrim(p.logline), '') is null
                    and coalesce(nullif(btrim(pr.s_logline), ''), nullif(btrim(pr.s_logline_en), '')) is not null
                    and (not pr.dans_ref or (pr.s_logline, pr.s_logline_en) is distinct from (pr.r_logline, pr.r_logline_en))
                   then coalesce(nullif(btrim(pr.s_logline), ''), nullif(btrim(pr.s_logline_en), '')) end),
  ('synopsis', case when nullif(btrim(p.synopsis), '') is null
                     and coalesce(nullif(btrim(pr.s_misc), ''), nullif(btrim(pr.s_misc_en), '')) is not null
                     and (not pr.dans_ref or (pr.s_misc, pr.s_misc_en) is distinct from (pr.r_misc, pr.r_misc_en))
                    then coalesce(nullif(btrim(pr.s_misc), ''), nullif(btrim(pr.s_misc_en), '')) end),
  ('language', case when nullif(btrim(p.language), '') is null and nullif(btrim(pr.s_langue), '') is not null
                     and (not pr.dans_ref or pr.s_langue is distinct from pr.r_langue) then btrim(pr.s_langue) end),
  ('country', case when nullif(btrim(p.country), '') is null and py.pays is not null and pr.mots_cles_changes then py.pays end),
  ('genre_slug', case when p.genre_slug is null and g.famille is not null and pr.mots_cles_changes then g.famille end),
  ('format', case when p.format is null and f.format is not null
                   and (pr.mots_cles_changes or pr.s_duree is distinct from pr.r_duree) then f.format end),
  ('budget_range', case when p.budget_range is null and p.format is distinct from 'court_metrage' and pg_temp.budget_wfg1(pr.s_budget) is not null
                         and (not pr.dans_ref or pr.s_budget is distinct from pr.r_budget) then pg_temp.budget_wfg1(pr.s_budget) end),
  ('target_audience', case when p.target_audience is null and p.format is distinct from 'court_metrage' and pg_temp.audience_wfg1(pr.s_audience) is not null
                            and (not pr.dans_ref or pr.s_audience is distinct from pr.r_audience) then pg_temp.audience_wfg1(pr.s_audience) end),
  ('bandeau', case when p.bandeau is null and pr.s_label between 1 and 5
                    and (not pr.dans_ref or pr.s_label is distinct from pr.r_label)
                   then (array['optionne', 'signe', 'tourne', 'script_prime', 'film_prime'])[pr.s_label] end)
) v(champ, valeur)
where not pr.a_creer and v.valeur is not null;

create temporary table projets_modifies on commit drop as
select pr.project_id, pr.wfg2_id, left(p.title, 60) as titre_wfg2, v.champ, left(v.wfg2, 160) as wfg2, left(v.wfg1, 160) as wfg1, left(v.sept, 160) as septembre
from projets pr join public.projects p on p.id = pr.wfg2_id, lateral (values
  ('titre', p.title, pr.s_titre, pr.r_titre), ('titre anglais', null, pr.s_titre_en, pr.r_titre_en),
  ('logline', p.logline, pr.s_logline, pr.r_logline), ('logline anglaise', null, pr.s_logline_en, pr.r_logline_en),
  ('synopsis', p.synopsis, pr.s_misc, pr.r_misc), ('synopsis anglais', null, pr.s_misc_en, pr.r_misc_en),
  ('mots-clés de la fiche', null, pr.s_kw, pr.r_kw), ('mots-clés des personnages', null, pr.s_ckw, pr.r_ckw),
  ('statut WFG 1', p.status::text, pr.s_status::text, pr.r_status::text), ('bandeau (labeled)', p.bandeau, pr.s_label::text, pr.r_label::text),
  ('budget', p.budget_range, pr.s_budget::text, pr.r_budget::text), ('public visé', p.target_audience, pr.s_audience::text, pr.r_audience::text),
  ('langue', p.language, pr.s_langue, pr.r_langue), ('durée/format', p.format::text, pr.s_duree, pr.r_duree),
  ('image', null, pr.s_image, pr.r_image), ('videopitch', null, pr.s_video, pr.r_video), ('festival', p.has_awards::text, pr.s_festival::text, pr.r_festival::text)
) v(champ, wfg2, wfg1, sept)
where not pr.a_creer and pr.dans_ref and v.wfg1 is distinct from v.sept and (v.wfg2 is null or v.wfg2 is distinct from v.wfg1);

select 'projets_complements', row_to_json(x)::text from (
  select project_id, titre_wfg2, champ, left(valeur, 120) as valeur from projets_complements order by project_id, champ) x;
select 'projets_modifies', row_to_json(x)::text from (select * from projets_modifies order by project_id, champ) x;

-- =====================================================================
-- 4. Les personnages
-- =====================================================================
create temporary table personnages on commit drop as
select s.character_id, s.project_id, nullif(btrim(s.name), '') as s_nom,
  coalesce(nullif(btrim(s.desc_fr), ''), nullif(btrim(s.desc_en), '')) as s_desc, s.type as s_type, s.gender as s_genre, s.age as s_age,
  (r.character_id is not null) as dans_ref, nullif(btrim(r.name), '') as r_nom,
  coalesce(nullif(btrim(r.desc_fr), ''), nullif(btrim(r.desc_en), '')) as r_desc, r.type as r_type, r.gender as r_genre, r.age as r_age,
  c.id as wfg2_id, pr.wfg2_id as projet_wfg2_id,
  case
    when c.id is not null then null
    when r.character_id is not null then 'dans la copie de septembre mais absent de WFG 2 : laissé de côté'
    when pr.project_id is null then 'projet WFG 1 introuvable'
    when pr.wfg2_id is null then 'projet non repris'
    when nullif(btrim(s.name), '') is null then 'sans nom'
    when exists (select 1 from public.characters x where x.project_id = pr.wfg2_id and lower(btrim(x.name)) = lower(btrim(s.name))) then 'un personnage du même nom existe déjà sur la fiche WFG 2'
  end as motif
from "${S}".characters_sheet s
left join public.characters c on c.legacy_id = s.character_id::text
left join ref_characters_sheet r on r.character_id = s.character_id
left join projets pr on pr.project_id = s.project_id;
alter table personnages add column a_creer boolean;
update personnages set a_creer = (wfg2_id is null and motif is null);

select 'personnages_nouveaux', row_to_json(x)::text from (
  select pe.character_id, pe.project_id, left(p.title, 50) as projet, pe.s_nom as nom, pe.s_type as type, pe.s_genre as genre, pe.s_age as age
  from personnages pe join public.projects p on p.id = pe.projet_wfg2_id where pe.a_creer order by pe.project_id, pe.character_id) x;
select 'personnages_ecartes', row_to_json(x)::text from (
  select motif, count(*) as n from personnages where wfg2_id is null and not a_creer group by motif order by n desc) x;

insert into public.characters (project_id, name, biography, character_type, gender, age_range, legacy_id)
select pe.projet_wfg2_id, pe.s_nom, pe.s_desc,
  (case when pe.s_type = 1 then 'principal' else 'secondaire' end)::public.character_type,
  case pe.s_genre when 1 then 'homme' when 0 then 'femme' end,
  (case pe.s_age when 0 then 'enfant' when 1 then 'adolescent' when 2 then 'adulte' when 3 then 'senior' end)::public.character_age_range,
  pe.character_id::text
from personnages pe where pe.a_creer;
insert into journal values ('personnages créés', (select count(*) from personnages where a_creer));

create temporary table personnages_complements on commit drop as
select pe.character_id, pe.wfg2_id, c.name as nom, v.champ, v.valeur
from personnages pe join public.characters c on c.id = pe.wfg2_id, lateral (values
  ('biography', case when nullif(btrim(c.biography), '') is null and pe.s_desc is not null and (not pe.dans_ref or pe.s_desc is distinct from pe.r_desc) then pe.s_desc end),
  ('gender', case when c.gender is null and pe.s_genre in (0, 1) and (not pe.dans_ref or pe.s_genre is distinct from pe.r_genre) then case pe.s_genre when 1 then 'homme' else 'femme' end end),
  ('age_range', case when c.age_range is null and pe.s_age between 0 and 3 and (not pe.dans_ref or pe.s_age is distinct from pe.r_age)
                      then (array['enfant', 'adolescent', 'adulte', 'senior'])[pe.s_age + 1] end)
) v(champ, valeur)
where not pe.a_creer and v.valeur is not null;

create temporary table personnages_modifies on commit drop as
select pe.character_id, pe.project_id, c.name as nom_wfg2, v.champ, left(v.wfg2, 160) as wfg2, left(v.wfg1, 160) as wfg1, left(v.sept, 160) as septembre
from personnages pe join public.characters c on c.id = pe.wfg2_id, lateral (values
  ('nom', c.name, pe.s_nom, pe.r_nom), ('description', c.biography, pe.s_desc, pe.r_desc),
  ('type', c.character_type::text, pe.s_type::text, pe.r_type::text), ('genre', c.gender, pe.s_genre::text, pe.r_genre::text),
  ('âge', c.age_range::text, pe.s_age::text, pe.r_age::text)
) v(champ, wfg2, wfg1, sept)
where not pe.a_creer and pe.dans_ref and v.wfg1 is distinct from v.sept and (v.wfg2 is null or v.wfg2 is distinct from v.wfg1);

select 'personnages_complements', row_to_json(x)::text from (
  select character_id, nom, champ, left(valeur, 120) as valeur from personnages_complements order by character_id, champ) x;
select 'personnages_modifies', row_to_json(x)::text from (select * from personnages_modifies order by character_id, champ) x;

-- =====================================================================
-- 5. Les mots-clés de WFG 1 (fiches nouvelles ou dont les mots-clés ont changé)
-- =====================================================================
create temporary table liens_mc on commit drop as
select distinct pr.wfg2_id as project_id, pr.project_id as legacy_id, j.famille, j.fr as libelle, j.slug
from projets pr join jetons j on j.project_id = pr.project_id
where pr.mots_cles_changes and pr.wfg2_id is not null and j.fr is not null and j.slug <> ''
  and ((j.origine = 'fiche' and j.famille in (2, 3, 4, 5, 6)) or (j.origine = 'perso' and j.famille in (5, 6)))
  and not (j.famille = 5 and j.numero = 0);

create temporary table mots_nouveaux on commit drop as
select distinct on (l.slug) l.slug,
  case when substr(l.libelle, 2) ~ '[[:upper:]]' or l.famille = 5 then l.libelle
       else lower(substr(l.libelle, 1, 1)) || substr(l.libelle, 2) end as label_fr, l.famille
from liens_mc l
where not exists (select 1 from public.keywords k where k.slug = l.slug)
order by l.slug, l.famille;

create temporary table liens_mc_nouveaux on commit drop as
select l.* from liens_mc l
where not exists (select 1 from public.project_keywords pk join public.keywords k on k.id = pk.keyword_id
                  where pk.project_id = l.project_id and k.slug = l.slug);

create temporary table selections_mc on commit drop as
select distinct pr.wfg2_id as project_id, pr.project_id as legacy_id, j.fr as libelle,
  exists (select 1 from public.selections_exclues e where e.libelle = j.fr) as exclue,
  exists (select 1 from public.project_selections ps where ps.project_id = pr.wfg2_id and ps.libelle = j.fr) as deja
from projets pr join jetons j on j.project_id = pr.project_id
where pr.mots_cles_changes and pr.wfg2_id is not null and j.origine = 'fiche' and j.famille = 7 and j.fr is not null;

create temporary table comediens_mc on commit drop as
select distinct pr.wfg2_id as project_id, pr.project_id as legacy_id, j.fr as libelle,
  exists (select 1 from public.project_actors a where a.project_id = pr.wfg2_id and a.libelle = j.fr) as deja
from projets pr join jetons j on j.project_id = pr.project_id
where pr.mots_cles_changes and pr.wfg2_id is not null and j.famille = 8 and j.fr is not null;

select 'mots_cles_resume', row_to_json(x)::text from (
  select famille, count(*) as liens_nouveaux, count(distinct project_id) as projets from liens_mc_nouveaux group by famille order by famille) x;
select 'mots_cles_nouveaux', row_to_json(x)::text from (select slug, label_fr, famille from mots_nouveaux order by famille, slug) x;
select 'selections_nouvelles', row_to_json(x)::text from (
  select s.legacy_id, left(p.title, 50) as titre, s.libelle, s.exclue from selections_mc s join public.projects p on p.id = s.project_id
  where not s.deja order by s.legacy_id, s.libelle) x;
select 'comediens_nouveaux', row_to_json(x)::text from (
  select c.legacy_id, left(p.title, 50) as titre, c.libelle from comediens_mc c join public.projects p on p.id = c.project_id
  where not c.deja order by c.legacy_id, c.libelle) x;
select 'mots_cles_projets', row_to_json(x)::text from (
  select l.legacy_id, left(p.title, 50) as titre, count(*) as liens from liens_mc_nouveaux l join public.projects p on p.id = l.project_id
  group by 1, 2 order by 1) x;

-- =====================================================================
-- 6. Les équipes
-- =====================================================================
create temporary table equipes on commit drop as
with src as (
  select l.link_id, l.project, lower(btrim(l.email)) as email, pg_temp.metier_code(l.job::text) as role_slug, 'people_linked' as origine,
    exists (select 1 from ref_people_linked r where r.link_id = l.link_id) as dans_ref
  from "${S}".people_linked l
  union all
  select null, c.project_id, lower(btrim(c.author_email)), 'scenariste', 'co_authors',
    exists (select 1 from ref_co_authors r where r.project_id = c.project_id and lower(btrim(r.author_email)) = lower(btrim(c.author_email)))
  from "${S}".co_authors c
)
select src.*, pr.wfg2_id,
  case
    when src.dans_ref then 'dans la copie de septembre : laissé tel quel'
    when pr.project_id is null then 'projet WFG 1 introuvable'
    when pr.wfg2_id is null then 'projet non repris'
    when src.email !~ ${EMAIL_VALIDE} then 'adresse invalide ou nom seul'
    when src.email = lower(btrim(a.email)) then 'l''auteur lui-même'
    when exists (select 1 from public.project_co_authors x where x.project_id = pr.wfg2_id and lower(btrim(x.invited_email)) = src.email) then 'déjà dans l''équipe WFG 2'
    when exists (select 1 from public.membres_supprimes m where lower(m.email) = src.email) then 'adresse d''un membre supprimé'
  end as motif
from src
left join projets pr on pr.project_id = src.project
left join "${S}".accounts a on a.user_id = pr.user_id;

create temporary table equipes_a_creer on commit drop as
select distinct on (e.wfg2_id, e.email) e.wfg2_id as project_id, e.project as legacy_id, e.email, e.role_slug, e.origine,
  (select u.id from auth.users u join public.profiles pp on pp.id = u.id
    where lower(u.email) = e.email and u.email_confirmed_at is not null limit 1) as profile_id
from equipes e where e.motif is null
order by e.wfg2_id, e.email, (e.role_slug is null), e.link_id;

select 'equipes_nouvelles', row_to_json(x)::text from (
  select e.legacy_id, left(p.title, 50) as titre, e.email, e.role_slug, (e.profile_id is not null) as compte_trouve
  from equipes_a_creer e join public.projects p on p.id = e.project_id order by e.legacy_id, e.email) x;
select 'equipes_ecartees', row_to_json(x)::text from (
  select motif, count(*) as n from equipes where motif is not null group by motif order by n desc) x;

-- =====================================================================
-- 7. Les fiches de lecture
-- =====================================================================
create temporary table fiches on commit drop as
select s.review_id, s.project, s.reader, s.status as s_status, r.status as r_status, l.statut as p_statut,
  (l.legacy_review_id is not null) as presente, pr.wfg2_id,
  case
    when l.legacy_review_id is not null then null
    when r.review_id is not null then 'dans la copie de septembre mais absente de WFG 2 : laissée de côté'
    when pr.project_id is null then 'projet WFG 1 introuvable'
    when pr.wfg2_id is null then 'projet non repris'
  end as motif
from "${S}".projects_review s
left join public.legacy_reading_reports l on l.legacy_review_id = s.review_id
left join ref_projects_review r on r.review_id = s.review_id
left join projets pr on pr.project_id = s.project;
alter table fiches add column a_creer boolean, add column statut_a_monter boolean;
update fiches set
  a_creer = (not presente and motif is null),
  statut_a_monter = (presente and s_status > p_statut and (r_status is null or s_status > r_status));

select 'fiches_nouvelles', row_to_json(x)::text from (
  select f.review_id, f.project as legacy_project_id, left(p.title, 50) as titre, f.reader as lecteur_wfg1, f.s_status as statut
  from fiches f join public.projects p on p.id = f.wfg2_id where f.a_creer order by f.review_id) x;
select 'fiches_statuts', row_to_json(x)::text from (
  select f.review_id, f.project as legacy_project_id, left(p.title, 50) as titre, f.p_statut as statut_wfg2, f.s_status as statut_wfg1
  from fiches f join public.projects p on p.id = f.wfg2_id where f.statut_a_monter order by f.review_id) x;
select 'fiches_ecartees', row_to_json(x)::text from (
  select motif, count(*) as n from fiches where not presente and not a_creer group by motif order by n desc) x;

-- =====================================================================
-- 8. Les anciens messages (comme la migration 0169)
-- =====================================================================
create temporary table messages on commit drop as
select c.chat_id, c.user_id, c.recipient_id, s.id as sender_id, d.id as recipient_id_wfg2, btrim(c.message) as corps, c.date,
  case
    when exists (select 1 from public.project_messages m where m.legacy_chat_id = c.chat_id) then 'déjà repris'
    when exists (select 1 from ref_chat r where r.chat_id = c.chat_id) then 'dans la copie de septembre : laissé tel quel'
    when s.id is null or d.id is null then 'expéditeur ou destinataire sans profil WFG 2'
    when s.id = d.id then 'message à soi-même'
    when nullif(btrim(c.message), '') is null then 'message vide'
    when exists (select 1 from public.profile_roles r where r.profile_id = d.id and r.role_slug = 'lecteur') then 'destinataire lecteur'
  end as motif
from "${S}".chat c
left join public.profiles s on s.legacy_id = c.user_id::text
left join public.profiles d on d.legacy_id = c.recipient_id::text;

select 'messages_resume', row_to_json(x)::text from (
  select coalesce(motif, 'à reprendre') as motif, count(*) as n from messages group by 1 order by 2 desc) x;
select 'messages_nouveaux', row_to_json(x)::text from (
  select chat_id, user_id as de_wfg1, recipient_id as a_wfg1, date, left(corps, 80) as debut from messages where motif is null order by chat_id) x;

-- =====================================================================
-- 9. Les videopitchs (numéros Vimeo de WFG 1)
-- =====================================================================
create temporary table videopitchs on commit drop as
select pr.project_id as legacy_id, pr.wfg2_id,
  (regexp_match(pr.s_video, 's:2:"fr";i:1;s:\d+:"(\d+)"'))[1] as fr,
  (regexp_match(pr.s_video, 's:2:"en";i:1;s:\d+:"(\d+)"'))[1] as en
from projets pr
where pr.wfg2_id is not null
  and (pr.a_creer or pr.s_video is distinct from pr.r_video)
  and pr.s_video ~ 's:2:"(fr|en)";i:1;s:\d+:"\d+"'
  and not exists (select 1 from public.project_videopitchs v where v.project_id = pr.wfg2_id);

select 'videopitchs_nouveaux', row_to_json(x)::text from (
  select v.legacy_id, left(p.title, 50) as titre, v.fr, v.en from videopitchs v join public.projects p on p.id = v.wfg2_id order by v.legacy_id) x;

-- =====================================================================
-- Sauvegarde : les lignes de WFG 2 qui vont être modifiées, telles quelles.
-- =====================================================================
select 'sauvegarde', json_build_object('table', 'profiles', 'ligne', row_to_json(p))::text
from public.profiles p where p.id in (
  select id from profils_complements union select id from langues_a_ajouter union select id from metiers_a_ajouter);
select 'sauvegarde', json_build_object('table', 'projects', 'ligne', row_to_json(p))::text
from public.projects p where p.id in (select wfg2_id from projets_complements union select project_id from liens_mc_nouveaux
                                      union select project_id from selections_mc where not deja union select project_id from comediens_mc where not deja);
select 'sauvegarde', json_build_object('table', 'characters', 'ligne', row_to_json(c))::text
from public.characters c where c.id in (select wfg2_id from personnages_complements);
select 'sauvegarde', json_build_object('table', 'legacy_reading_reports', 'ligne', row_to_json(l))::text
from public.legacy_reading_reports l where l.legacy_review_id in (select review_id from fiches where statut_a_monter);
select 'sauvegarde', json_build_object('table', 'project_keywords', 'ligne', row_to_json(pk))::text
from public.project_keywords pk where pk.project_id in (select project_id from liens_mc) and (pk.source is null or pk.source = 'ia');

select '##FIN_ANALYSE';
`;

const SQL_APPLICATION = String.raw`
-- Profils.
update public.profiles p set first_name = v.valeur from profils_complements v where v.id = p.id and v.champ = 'first_name';
update public.profiles p set last_name = v.valeur from profils_complements v where v.id = p.id and v.champ = 'last_name';
update public.profiles p set full_name = v.valeur from profils_complements v where v.id = p.id and v.champ = 'full_name';
update public.profiles p set city = v.valeur from profils_complements v where v.id = p.id and v.champ = 'city';
update public.profiles p set country = v.valeur from profils_complements v where v.id = p.id and v.champ = 'country';
update public.profiles p set biofilmo = v.valeur from profils_complements v where v.id = p.id and v.champ = 'biofilmo';
update public.profiles p set category = v.valeur::public.profile_category from profils_complements v where v.id = p.id and v.champ = 'category';
update public.profiles p set validation_status = 'validee', validated_at = coalesce(p.validated_at, now()) from profils_complements v where v.id = p.id and v.champ = 'validation_status';
update public.profiles p set testimonial = v.valeur, testimonial_is_public = true from profils_complements v where v.id = p.id and v.champ = 'testimonial';
update public.profiles p set personality_answers = v.valeur::jsonb from profils_complements v where v.id = p.id and v.champ = 'personality_answers';
insert into journal values ('champs de profil complétés', (select count(*) from profils_complements));
insert into public.profile_languages (profile_id, language_code) select id, code from langues_a_ajouter on conflict do nothing;
insert into journal values ('langues ajoutées', (select count(*) from langues_a_ajouter));
insert into public.profile_roles (profile_id, role_slug) select id, slug from metiers_a_ajouter on conflict do nothing;
insert into journal values ('métiers ajoutés', (select count(*) from metiers_a_ajouter));

-- Projets.
update public.projects p set title = v.valeur from projets_complements v where v.wfg2_id = p.id and v.champ = 'title';
update public.projects p set logline = v.valeur from projets_complements v where v.wfg2_id = p.id and v.champ = 'logline';
update public.projects p set synopsis = v.valeur from projets_complements v where v.wfg2_id = p.id and v.champ = 'synopsis';
update public.projects p set language = v.valeur from projets_complements v where v.wfg2_id = p.id and v.champ = 'language';
update public.projects p set country = v.valeur from projets_complements v where v.wfg2_id = p.id and v.champ = 'country';
update public.projects p set genre_slug = v.valeur, genre_legacy = coalesce(p.genre_legacy, g.fr)
  from projets_complements v join projets pr on pr.wfg2_id = v.wfg2_id left join genres_projets g on g.project_id = pr.project_id
 where v.wfg2_id = p.id and v.champ = 'genre_slug';
update public.projects p set format = v.valeur::public.project_format from projets_complements v where v.wfg2_id = p.id and v.champ = 'format';
update public.projects p set budget_range = v.valeur from projets_complements v where v.wfg2_id = p.id and v.champ = 'budget_range';
update public.projects p set target_audience = v.valeur from projets_complements v where v.wfg2_id = p.id and v.champ = 'target_audience';
update public.projects p set bandeau = v.valeur from projets_complements v where v.wfg2_id = p.id and v.champ = 'bandeau';
insert into journal values ('champs de fiche complétés', (select count(*) from projets_complements));

-- Personnages.
update public.characters c set biography = v.valeur from personnages_complements v where v.wfg2_id = c.id and v.champ = 'biography';
update public.characters c set gender = v.valeur from personnages_complements v where v.wfg2_id = c.id and v.champ = 'gender';
update public.characters c set age_range = v.valeur::public.character_age_range from personnages_complements v where v.wfg2_id = c.id and v.champ = 'age_range';
insert into journal values ('champs de personnage complétés', (select count(*) from personnages_complements));

-- Mots-clés : mots nouveaux, liens (un lien déjà posé par l'IA passe en
-- source wfg1 pour ne plus pouvoir être effacé, comme en 0230).
insert into public.keywords (slug, label_fr) select slug, label_fr from mots_nouveaux on conflict (slug) do nothing;
insert into journal values ('mots-clés créés', (select count(*) from mots_nouveaux));
insert into public.project_keywords (project_id, keyword_id, source)
select distinct l.project_id, k.id, 'wfg1' from liens_mc l join public.keywords k on k.slug = l.slug
on conflict (project_id, keyword_id) do update set source = 'wfg1'
  where public.project_keywords.source is null or public.project_keywords.source = 'ia';
insert into journal values ('liens de mots-clés ajoutés', (select count(*) from liens_mc_nouveaux));
insert into public.project_selections (project_id, libelle) select project_id, libelle from selections_mc where not deja on conflict do nothing;
insert into journal values ('sélections ajoutées', (select count(*) from selections_mc where not deja and not exclue));
insert into public.project_actors (project_id, libelle) select project_id, libelle from comediens_mc where not deja on conflict do nothing;
insert into journal values ('comédiens envisagés ajoutés', (select count(*) from comediens_mc where not deja));

-- Équipes.
insert into public.project_co_authors (project_id, invited_email, status, role_slug, profile_id, responded_at)
select project_id, email, 'accepte', role_slug, profile_id, case when profile_id is not null then now() end from equipes_a_creer;
insert into journal values ('liens d''équipe ajoutés', (select count(*) from equipes_a_creer));

-- Fiches de lecture.
insert into public.legacy_reading_reports (legacy_review_id, project_id, content, final_mark, marks, wfg_review, wfg_review_en, author_rating, reader_legacy_id, read_at, statut)
select s.review_id, f.wfg2_id, s.analysis, s.final_mark, s.marks, s.wfg_review, s.wfg_review_en, s.author_rating, s.reader,
       pg_temp.date_paris(s.date), coalesce(s.status, 2)
from fiches f join "${S}".projects_review s on s.review_id = f.review_id
where f.a_creer and s.status in (0, 1, 2)
on conflict (legacy_review_id) do nothing;
insert into journal values ('fiches de lecture ajoutées', (select count(*) from fiches where a_creer));
update public.legacy_reading_reports l set statut = f.s_status from fiches f where f.review_id = l.legacy_review_id and f.statut_a_monter and f.s_status in (0, 1, 2);
insert into journal values ('statuts de fiches montés', (select count(*) from fiches where statut_a_monter));

-- Messages.
insert into public.project_messages (project_id, sender_id, recipient_id, body, created_at, read_at, legacy_chat_id)
select null, m.sender_id, m.recipient_id_wfg2, m.corps, pg_temp.date_paris(m.date), pg_temp.date_paris(m.date), m.chat_id
from messages m where m.motif is null
on conflict (legacy_chat_id) where legacy_chat_id is not null do nothing;
insert into journal values ('anciens messages ajoutés', (select count(*) from messages where motif is null));

-- Videopitchs.
insert into public.project_videopitchs (project_id, videopitch_fr, videopitch_en)
select wfg2_id, fr, en from videopitchs where fr is not null or en is not null;
insert into journal values ('videopitchs ajoutés', (select count(*) from videopitchs where fr is not null or en is not null));

select 'journal', row_to_json(x)::text from (select * from journal) x;

-- Contrôle : un compte créé ici a la même forme qu'un compte créé par
-- l'API d'administration lors du premier import.
select 'controle_comptes', row_to_json(x)::text from (
  select (select count(*) from comptes_crees) as crees,
         (select count(*) from comptes_crees c join auth.identities i on i.user_id = c.id) as avec_identite,
         (select count(*) from comptes_crees c join public.profiles p on p.id = c.id and p.legacy_id = c.user_id::text) as avec_profil,
         (select count(*) from comptes_crees c join auth.users u on u.id = c.id where u.email_confirmed_at is not null and u.confirmed_at is not null) as confirmes
) x;
select '##FIN_APPLICATION';
`;

// ---------------------------------------------------------------------
// Exécution : une seule session psql, pilotée phase par phase.
// ---------------------------------------------------------------------
const rapport = {};
const sauvegarde = [];
function noter(ligne) {
  const i = ligne.indexOf("\t");
  if (i < 0) return;
  const section = ligne.slice(0, i);
  let valeur;
  try { valeur = JSON.parse(ligne.slice(i + 1)); } catch { valeur = ligne.slice(i + 1); }
  if (section === "sauvegarde") sauvegarde.push(valeur);
  else (rapport[section] ??= []).push(valeur);
}

const psql = spawn("docker", PSQL, { stdio: ["pipe", "pipe", "pipe"] });
let stderr = "";
psql.stderr.on("data", (d) => (stderr += d));
let tampon = "";
let attente = null; // { marque, resoudre, rejeter }
let termine = false;
psql.stdout.on("data", (d) => {
  tampon += d;
  const lignes = tampon.split("\n");
  tampon = lignes.pop();
  for (const l of lignes) {
    if (l.startsWith("##")) {
      if (attente && attente.marque === l) { const a = attente; attente = null; a.resoudre(); }
    } else noter(l);
  }
});
psql.on("close", (code) => {
  termine = true;
  if (attente) attente.rejeter(new Error(`psql s'est arrêté (code ${code}) :\n${stderr.trim()}`));
});
function phase(sql, marque) {
  return new Promise((resoudre, rejeter) => {
    if (termine) return rejeter(new Error(`psql déjà arrêté :\n${stderr.trim()}`));
    attente = { marque, resoudre, rejeter };
    psql.stdin.write(sql + `\nselect '${marque}';\n`);
  });
}

const horodatage = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
mkdirSync(DOSSIER, { recursive: true });
const base = join(DOSSIER, `reimport-wfg1-${MODE}-${horodatage}`);

console.log(`Réimportation WFG 1 → WFG 2, mode ${APPLIQUER ? "APPLIQUER (pour de vrai)" : "ESSAI (rien ne sera écrit)"}`);
console.log(`  source : ${S}   référence : ${R ?? "aucune (--sans-reference)"}`);
const debut = Date.now();
try {
  await phase(SQL_PREPARATION, "##FIN_ANALYSE");
  console.log(`  analyse faite en ${Math.round((Date.now() - debut) / 1000)} s ; ${sauvegarde.length} lignes de WFG 2 à modifier.`);
  if (APPLIQUER) {
    writeFileSync(`${base}-sauvegarde.json`, JSON.stringify({ mode: MODE, source: S, reference: R, date: new Date().toISOString(), lignes: sauvegarde }, null, 1));
    console.log(`  sauvegarde écrite : ${base}-sauvegarde.json`);
  }
  await phase(SQL_APPLICATION, "##FIN_APPLICATION");
  await phase(APPLIQUER ? "commit;" : "rollback;", "##FIN");
  psql.stdin.end();
} catch (e) {
  console.error("\nÉCHEC — la transaction est annulée, rien n'a été écrit.\n" + e.message);
  try { psql.stdin.end("rollback;\n"); } catch {}
  process.exit(1);
}

// ---------------------------------------------------------------------
// Le rapport
// ---------------------------------------------------------------------
const n = (s) => rapport[s]?.length ?? 0;
const journal = Object.fromEntries((rapport.journal ?? []).map((j) => [j.etape, Number(j.n)]));
const L = [];
const titre = (t) => L.push("", `## ${t}`, "");
function liste(section, format, { max = 150, vide = "aucun." } = {}) {
  const rows = rapport[section] ?? [];
  if (!rows.length) { if (vide) L.push(`_${vide}_`); return; }
  for (const r of rows.slice(0, max)) L.push(`- ${format(r)}`);
  if (rows.length > max) L.push(`- … et ${rows.length - max} autres (voir le fichier .json).`);
}
const v = (x) => (x === null || x === undefined ? "—" : String(x).replace(/\s+/g, " "));

L.push(`# Réimportation WFG 1 → WFG 2 — ${APPLIQUER ? "APPLIQUÉE" : "ESSAI (transaction annulée, rien d'écrit)"}`);
L.push("", `Date : ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (heure de Paris). Source : schéma \`${S}\`. Référence (copie de septembre) : ${R ? `schéma \`${R}\`` : "aucune"}.`);
L.push("", "Règle : on ajoute ce qui est nouveau sur WFG 1 ; pour ce qui existe déjà sur WFG 2, on complète seulement les champs vides, et seulement si WFG 1 a changé depuis septembre. Rien n'est écrasé ni supprimé.");

titre("En un coup d'œil");
const resume = [
  ["Comptes créés", journal["comptes créés"]],
  ["Champs de profil complétés", journal["champs de profil complétés"]],
  ["Langues ajoutées", journal["langues ajoutées"]],
  ["Métiers ajoutés", journal["métiers ajoutés"]],
  ["Projets créés", journal["projets créés"]],
  ["Champs de fiche complétés", journal["champs de fiche complétés"]],
  ["Personnages créés", journal["personnages créés"]],
  ["Champs de personnage complétés", journal["champs de personnage complétés"]],
  ["Mots-clés créés", journal["mots-clés créés"]],
  ["Liens de mots-clés ajoutés", journal["liens de mots-clés ajoutés"]],
  ["Sélections ajoutées", journal["sélections ajoutées"]],
  ["Comédiens envisagés ajoutés", journal["comédiens envisagés ajoutés"]],
  ["Liens d'équipe ajoutés", journal["liens d'équipe ajoutés"]],
  ["Fiches de lecture ajoutées", journal["fiches de lecture ajoutées"]],
  ["Statuts de fiches montés", journal["statuts de fiches montés"]],
  ["Anciens messages ajoutés", journal["anciens messages ajoutés"]],
  ["Videopitchs ajoutés", journal["videopitchs ajoutés"]],
];
L.push("| Quoi | Combien |", "|---|---:|");
for (const [k, val] of resume) L.push(`| ${k} | ${val ?? 0} |`);
const totalAjouts = resume.reduce((a, [, x]) => a + (x ?? 0), 0);
L.push("", totalAjouts === 0 ? "**Aucun ajout : tout est déjà repris.**" : `**${totalAjouts} ajouts ou compléments au total.**`);
L.push("", `Modifié sur WFG 1 entre les deux copies alors que WFG 2 a déjà sa valeur (listé, **jamais appliqué**) : ${n("profils_modifies")} champs de profil, ${n("projets_modifies")} champs de fiche, ${n("personnages_modifies")} champs de personnage.`);

titre("Comptes");
L.push(`Nouveaux comptes à créer : ${n("comptes_nouveaux")}.`);
liste("comptes_nouveaux", (r) => `n° ${r.user_id} — ${v(r.prenom)} ${v(r.nom)} (${r.role}) — ${r.email} — inscrit le ${v(r.registration_date)}`);
L.push("", "Comptes WFG 1 sans profil WFG 2, écartés :");
liste("comptes_ecartes", (r) => `${r.n} — ${r.motif}`);
if (n("comptes_ecartes_detail")) {
  L.push("", "À regarder de près (adresse déjà prise ou partagée) :");
  liste("comptes_ecartes_detail", (r) => `n° ${r.user_id} — ${v(r.prenom)} ${v(r.nom)} (${r.role}) — ${r.email} — ${r.motif}`);
}
if (rapport.controle_comptes?.[0]) {
  const c = rapport.controle_comptes[0];
  L.push("", `Contrôle des comptes créés : ${c.crees} créés, ${c.avec_identite} avec identité, ${c.avec_profil} avec profil relié, ${c.confirmes} confirmés.`);
}

titre("Profils : champs complétés");
liste("profils_complements", (r) => `n° ${r.legacy_id} (${r.email})${r.nouveau ? " [nouveau]" : ""} — ${r.champ} ← « ${v(r.valeur)} »`, { max: 300 });
L.push("", "Langues ajoutées :");
liste("profils_langues", (r) => `n° ${r.legacy_id} (${r.email}) — ${r.langues}`);
L.push("", "Métiers ajoutés :");
liste("profils_metiers", (r) => `n° ${r.legacy_id} (${r.email}) — ${r.metiers}`);
L.push("", "Modifiés sur WFG 1 depuis septembre, WFG 2 garde sa valeur (non appliqué) :");
liste("profils_modifies", (r) => `n° ${r.legacy_id} (${r.email}) — ${r.champ} : WFG 2 « ${v(r.wfg2)} » / WFG 1 maintenant « ${v(r.wfg1)} » / septembre « ${v(r.septembre)} »`);

titre("Projets");
L.push(`Nouveaux projets à créer : ${n("projets_nouveaux")}.`);
liste("projets_nouveaux", (r) => `n° ${r.project_id} — « ${v(r.titre)} » — auteur WFG 1 n° ${r.user_id} (${v(r.auteur_email)})${r.auteur_nouveau ? " [compte nouveau]" : ""} — statut WFG 1 ${r.statut_wfg1}, ${v(r.format)}, ${v(r.genre)}, déposé le ${v(r.date_wfg1)}`);
L.push("", "Projets WFG 1 sans fiche WFG 2, écartés :");
liste("projets_ecartes", (r) => `${r.n} — ${r.motif}`);
liste("projets_ecartes_detail", (r) => `n° ${r.project_id} — « ${v(r.titre)} » — auteur n° ${r.user_id} — ${r.motif}`, { max: 60, vide: "" });
L.push("", "Champs de fiche complétés :");
liste("projets_complements", (r) => `n° ${r.project_id} « ${v(r.titre_wfg2)} » — ${r.champ} ← « ${v(r.valeur)} »`);
L.push("", "Modifiés sur WFG 1 depuis septembre, WFG 2 garde sa valeur (non appliqué, à voir avec Sarah) :");
liste("projets_modifies", (r) => `n° ${r.project_id} « ${v(r.titre_wfg2)} » — ${r.champ} : WFG 2 « ${v(r.wfg2)} » / WFG 1 maintenant « ${v(r.wfg1)} » / septembre « ${v(r.septembre)} »`, { max: 300 });

titre("Personnages");
L.push(`Nouveaux personnages : ${n("personnages_nouveaux")}.`);
liste("personnages_nouveaux", (r) => `n° ${r.character_id} — ${v(r.nom)} — projet n° ${r.project_id} « ${v(r.projet)} »`);
L.push("", "Écartés :");
liste("personnages_ecartes", (r) => `${r.n} — ${r.motif}`);
L.push("", "Champs complétés :");
liste("personnages_complements", (r) => `n° ${r.character_id} ${v(r.nom)} — ${r.champ} ← « ${v(r.valeur)} »`);
L.push("", "Modifiés sur WFG 1 depuis septembre (non appliqué) :");
liste("personnages_modifies", (r) => `n° ${r.character_id} ${v(r.nom_wfg2)} — ${r.champ} : WFG 2 « ${v(r.wfg2)} » / WFG 1 « ${v(r.wfg1)} » / septembre « ${v(r.septembre)} »`);

titre("Mots-clés de WFG 1");
L.push("Liens nouveaux par famille (2 tons, 3 thèmes, 4 construction, 5 pays, 6 décors) :");
liste("mots_cles_resume", (r) => `famille ${r.famille} : ${r.liens_nouveaux} liens sur ${r.projets} projets`);
L.push("", "Projets concernés :");
liste("mots_cles_projets", (r) => `n° ${r.legacy_id} « ${v(r.titre)} » — ${r.liens} liens`);
L.push("", "Mots nouveaux dans le dictionnaire de WFG 2 :");
liste("mots_cles_nouveaux", (r) => `${r.label_fr} (famille ${r.famille})`);
L.push("", "Sélections (famille 7) — une clé Finder est refusée par selections_exclues :");
liste("selections_nouvelles", (r) => `n° ${r.legacy_id} « ${v(r.titre)} » — ${r.libelle}${r.exclue ? " — REFUSÉE (clé Finder)" : ""}`);
L.push("", "Comédiens envisagés (famille 8) :");
liste("comediens_nouveaux", (r) => `n° ${r.legacy_id} « ${v(r.titre)} » — ${r.libelle}`);

titre("Équipes");
L.push(`Liens d'équipe à ajouter : ${n("equipes_nouvelles")}. Un talent sans compte attend son inscription (ou creer-profils-equipes-wfg1.mjs).`);
liste("equipes_nouvelles", (r) => `projet n° ${r.legacy_id} « ${v(r.titre)} » — ${r.email} — ${v(r.role_slug)}${r.compte_trouve ? " — compte trouvé" : " — pas de compte"}`);
L.push("", "Écartés :");
liste("equipes_ecartees", (r) => `${r.n} — ${r.motif}`);

titre("Fiches de lecture");
L.push(`Nouvelles fiches : ${n("fiches_nouvelles")}. Statuts montés (fiche validée sur WFG 1 depuis septembre) : ${n("fiches_statuts")}.`);
liste("fiches_nouvelles", (r) => `fiche n° ${r.review_id} — projet n° ${r.legacy_project_id} « ${v(r.titre)} » — lecteur WFG 1 n° ${v(r.lecteur_wfg1)} — statut ${r.statut}`);
liste("fiches_statuts", (r) => `fiche n° ${r.review_id} — « ${v(r.titre)} » — ${r.statut_wfg2} → ${r.statut_wfg1}`, { vide: "" });
L.push("", "Écartées :");
liste("fiches_ecartees", (r) => `${r.n} — ${r.motif}`);

titre("Anciens messages");
liste("messages_resume", (r) => `${r.n} — ${r.motif}`);
liste("messages_nouveaux", (r) => `n° ${r.chat_id} — de ${r.de_wfg1} à ${r.a_wfg1} — ${v(r.date)} — « ${v(r.debut)}… »`, { max: 50, vide: "" });

titre("Videopitchs");
liste("videopitchs_nouveaux", (r) => `n° ${r.legacy_id} « ${v(r.titre)} » — fr ${v(r.fr)} / en ${v(r.en)}`);

titre("Et après ce script");
L.push("- Images : `node scripts/importer-images-wfg1.mjs` (avatars, vignettes, portraits), puis documents : `node scripts/importer-docs-wfg1.mjs`.");
L.push("- Équipiers sans compte : `node scripts/creer-profils-equipes-wfg1.mjs --a-blanc` puis sans `--a-blanc`.");
L.push("- Accents perdus : `node scripts/corriger-accents.mjs essai` puis `appliquer`.");
L.push("- Les nouvelles fiches n'ont ni tagline ni mots-clés IA : le rattrapage horaire pose les vecteurs ; la tagline et les mots-clés IA se font comme d'habitude.");
L.push("", `Fichier complet : ${base}.json` + (APPLIQUER ? ` — sauvegarde des lignes modifiées : ${base}-sauvegarde.json` : ""));

writeFileSync(`${base}.md`, L.join("\n") + "\n");
writeFileSync(`${base}.json`, JSON.stringify({ mode: MODE, source: S, reference: R, journal, rapport }, null, 1));
console.log(`\n${L.slice(0, resume.length + 12).join("\n")}\n\nRapport : ${base}.md  (${Math.round((Date.now() - debut) / 1000)} s)`);
if (!APPLIQUER) console.log("Mode essai : transaction annulée, rien n'a été écrit dans la base.");
