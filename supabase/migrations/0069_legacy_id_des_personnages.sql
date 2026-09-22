-- =====================================================================
-- Un identifiant hérité pour les personnages, comme les projets et les
-- profils en ont déjà un.
--
-- Nécessaire pour rapatrier leurs portraits (img/characters/<id>.ext
-- dans l'export WFG 1) : sans lui, aucun moyen de relier un personnage
-- WFG 2 à sa fiche d'origine. On le retrouve par rapprochement — même
-- projet, même nom, sans accent ni casse — et on l'associe une seule
-- fois de chaque côté (un personnage WFG 2 ↔ une fiche WFG 1), pour ne
-- jamais poser deux fois le même portrait.
-- =====================================================================

alter table public.characters add column if not exists legacy_id text unique;

with correspondance as (
  select
    c.id as character_id,
    w.character_id as legacy_character_id,
    row_number() over (partition by c.id order by w.character_id) as rang_cote_wfg2,
    row_number() over (partition by w.character_id order by c.id) as rang_cote_wfg1
  from public.characters c
  join public.projects p on p.id = c.project_id
  join wfg1.characters_sheet w
    on w.project_id::text = p.legacy_id
    and lower(btrim(w.name)) = lower(btrim(c.name))
  where p.legacy_id is not null
)
update public.characters c
set legacy_id = correspondance.legacy_character_id::text
from correspondance
where correspondance.character_id = c.id
  and correspondance.rang_cote_wfg2 = 1
  and correspondance.rang_cote_wfg1 = 1;
