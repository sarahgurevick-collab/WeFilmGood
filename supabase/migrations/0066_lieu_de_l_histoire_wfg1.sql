-- =====================================================================
-- Le lieu de l'histoire des fiches WFG 1.
--
-- Sur WFG 1, le lieu était une catégorie de mots-clés (jeton « |5-N| »
-- dans keywords, N = numéro dans wfg1.keywords, catégorie 5). L'import
-- ne l'avait pas repris : projects.country était vide partout.
--
-- Le « bug Royaume-Uni » signalé par Sarah : Royaume-Uni est le
-- premier lieu de la liste (N = 0), et WFG 1 l'affichait par défaut sur
-- les fiches sans lieu. 714 fiches n'ont aucun lieu et 11 seulement ont
-- explicitement le Royaume-Uni. Ici, une fiche sans lieu reste sans
-- lieu : rien n'est inventé. Quand une fiche en portait plusieurs (66),
-- on garde le premier.
-- =====================================================================

with premier_lieu as (
  select
    w.project_id::text as legacy_id,
    (regexp_match(w.keywords, '\|5-([0-9]+)\|'))[1]::int as n
  from wfg1.projects w
  where w.keywords ~ '\|5-[0-9]+\|'
)
update public.projects p
set country = k.fr
from premier_lieu l
join wfg1.keywords k on k.category = 5 and k.keyword = l.n
where p.legacy_id = l.legacy_id
  and p.country is null;
