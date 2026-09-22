-- =====================================================================
-- Les pseudonymes de WFG 1.
--
-- Sur WFG 1, un membre qui remplissait la case « pseudonyme » était
-- affiché sous ce nom partout, pitchothèque comprise. L'import n'avait
-- repris que prénom et nom : 1 641 membres apparaissaient sur WFG 2
-- sous leur vrai nom, sans l'avoir choisi — pour certains, c'est
-- précisément ce qu'ils voulaient éviter.
--
-- Décision de Sarah (22/09/2026) : pas de case pseudonyme sur WFG 2.
-- On reprend le pseudonyme de WFG 1 dans display_name, que le site
-- affiche déjà à la place du nom quand il est rempli (fiche projet,
-- équipe, page membre, recherche). Le jour où le membre enregistre son
-- bloc « Qui êtes-vous ? », display_name est effacé : prénom et nom
-- prennent le relais, choisis en connaissance de cause (voir
-- saveIdentite). Les 336 pseudonymes qui répétaient le nom sont ignorés.
-- =====================================================================

with pseudo as (
  select user_id, btrim(value) as pseudo
  from wfg1.user_data
  where name = 'pseudonym' and btrim(coalesce(value, '')) <> ''
),
noms as (
  select a.user_id,
         btrim(coalesce(f.value, '')) as prenom,
         btrim(coalesce(l.value, '')) as nom
  from wfg1.accounts a
  left join wfg1.user_data f on f.user_id = a.user_id and f.name = 'first_name'
  left join wfg1.user_data l on l.user_id = a.user_id and l.name = 'last_name'
),
differents as (
  select p.user_id, p.pseudo
  from pseudo p join noms n on n.user_id = p.user_id
  where lower(p.pseudo) not in (
    lower(n.prenom), lower(n.nom),
    lower(n.prenom || ' ' || n.nom), lower(n.nom || ' ' || n.prenom),
    lower(n.prenom || n.nom)
  )
)
update public.profiles pr
set display_name = d.pseudo
from differents d
where pr.legacy_id = d.user_id::text
  and btrim(coalesce(pr.display_name, '')) = '';
