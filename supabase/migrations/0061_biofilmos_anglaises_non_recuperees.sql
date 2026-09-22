-- =====================================================================
-- Les biofilmographies rédigées en anglais sur WFG 1 étaient arrivées
-- vides — et les françaises dormaient dans la mauvaise colonne.
--
-- Même défaut que la migration 0060 pour les fiches projet : l'import
-- initial n'a repris que wfg1.accounts.biofilmo_fr. Les membres qui
-- avaient rempli biofilmo_en à la place (1 113 comptes, dont 126 sans
-- version française) arrivaient sur WFG 2 avec « Ce membre n'a pas
-- encore rédigé sa biographie ».
--
-- Au passage, l'import initial avait rangé les 3 236 bios françaises
-- dans profiles.bio (colonne de 0001_init), alors que tout ce qui a été
-- construit depuis — le bloc « Votre parcours » de /profil, la jauge de
-- complétion, la reprise d'un profil hérité (0024), les prises de place
-- de l'administration (0043) — lit et écrit profiles.biofilmo. Seule la
-- page /membres/<id> et le compteur de recherche regardaient encore
-- `bio`. Résultat : un membre repris de WFG 1 voyait son bloc
-- « parcours » vide, et un membre qui l'avait rempli sur WFG 2 n'avait
-- rien d'affiché sur sa page. On unifie sur `biofilmo` ; `bio` reste en
-- place mais n'est plus lue.
--
-- Décision de Sarah (22/09/2026, cf. 0060) : la plateforme sera traduite
-- automatiquement, un texte anglais compte comme un texte français, il
-- va dans la même colonne.
-- =====================================================================

-- 1. Les bios françaises importées rejoignent la colonne que le site lit.
update public.profiles
set biofilmo = btrim(bio)
where btrim(coalesce(biofilmo, '')) = ''
  and btrim(coalesce(bio, '')) <> '';

-- 2. Les bios anglaises des comptes repris (profils déjà créés). 126.
update public.profiles p
set biofilmo = btrim(a.biofilmo_en)
from wfg1.accounts a
where a.user_id::text = p.legacy_id
  and btrim(coalesce(p.biofilmo, '')) = ''
  and btrim(coalesce(a.biofilmo_en, '')) <> '';

-- 3. Les bios anglaises des profils réclamables (pas encore de compte
--    WFG 2) : elles seront recopiées dans profiles.biofilmo le jour où
--    la personne s'inscrit. 263 (3 autres étaient déjà réclamés).
update public.legacy_profiles l
set biofilmo = btrim(a.biofilmo_en)
from wfg1.accounts a
where a.user_id = l.legacy_user_id
  and l.claimed_by is null
  and btrim(coalesce(l.biofilmo, '')) = ''
  and btrim(coalesce(a.biofilmo_en, '')) <> '';

-- 4. Le compteur de la recherche (0033) cherche désormais dans biofilmo.
create or replace function public.compter_recherche(q text)
returns table(projets bigint, talents bigint, personnages bigint)
language sql
stable security definer
set search_path to 'public'
as $$
  with terme as (
    select nullif(btrim(q), '') as mot,
           '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  mots as (
    select k.id from public.keywords k, terme t
    where t.mot is not null
      and (k.label_fr ilike t.motif or similarity(k.label_fr, t.mot) >= 0.45)
  )
  select
    (select count(distinct p.id) from public.projects p, terme t
       where t.mot is not null and p.is_public
         and (p.title ilike t.motif or p.logline ilike t.motif or p.synopsis ilike t.motif
              or exists (select 1 from public.project_keywords pk
                         where pk.project_id = p.id and pk.keyword_id in (select id from mots)))),
    (select count(*) from public.profiles pr, terme t
       where t.mot is not null
         and (pr.biofilmo ilike t.motif or pr.full_name ilike t.motif or pr.display_name ilike t.motif)),
    (select count(*) from public.characters c
       join public.projects p on p.id = c.project_id, terme t
       where t.mot is not null and p.is_public
         and (c.name ilike t.motif or c.biography ilike t.motif));
$$;
