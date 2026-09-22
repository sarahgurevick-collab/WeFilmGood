-- =====================================================================
-- Les personnages décrits en anglais sur WFG 1 étaient arrivés muets.
--
-- Même défaut que 0060 et 0061 : l'import initial n'a repris que
-- wfg1.characters_sheet.desc_fr dans public.characters.biography. 271
-- fiches WFG 1 n'avaient qu'une description anglaise (602 en ont une),
-- soit 278 personnages sur WFG 2.
--
-- public.characters n'a pas gardé d'identifiant WFG 1 : on retrouve la
-- fiche d'origine par le projet (projects.legacy_id) et le nom du
-- personnage. Vérifié avant d'écrire : aucun cas où deux fiches de même
-- nom sur le même projet portent des descriptions anglaises
-- différentes, donc `distinct on` suffit pour lever les doublons.
--
-- Décision de Sarah (22/09/2026) : un texte anglais compte comme un
-- texte français, même colonne.
-- =====================================================================

update public.characters c
set biography = s.desc_en
from (
  select distinct on (c2.id) c2.id, btrim(s2.desc_en) as desc_en
  from public.characters c2
  join public.projects p on p.id = c2.project_id
  join wfg1.characters_sheet s2
    on s2.project_id::text = p.legacy_id
   and btrim(s2.name) = btrim(c2.name)
  where btrim(coalesce(c2.biography, '')) = ''
    and btrim(coalesce(s2.desc_en, '')) <> ''
  order by c2.id, s2.character_id
) s
where s.id = c.id;
