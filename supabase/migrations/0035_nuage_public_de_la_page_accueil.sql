-- =====================================================================
-- L'aperçu du nuage sur la page d'accueil.
--
-- Depuis que les liens projet-mots-clés sont réservés aux membres, un
-- visiteur ne peut plus rien compter lui-même. Cette fonction lui donne
-- le strict nécessaire pour un aperçu : les mots les plus portés et leur
-- poids relatif, sans effectif chiffré, sans lien vers aucun projet.
--
-- Les chiffres exacts, le nuage complet et le clic qui lance une
-- recherche restent réservés aux adhérents : c'est l'écart entre les
-- deux qui donne envie d'adhérer.
-- =====================================================================

create or replace function public.nuage_public(p_limite int default 15)
returns table (label_fr text, poids real)
language sql
stable
security definer
set search_path = public
as $$
  with comptes as (
    select k.label_fr, count(*)::real as n
    from public.keywords k
    join public.project_keywords pk on pk.keyword_id = k.id
    join public.projects p on p.id = pk.project_id
    where p.is_public
    group by k.label_fr
    order by count(*) desc
    limit greatest(p_limite, 1)
  )
  -- Poids de 0 à 1, sur une échelle logarithmique : sinon le mot le plus
  -- fréquent (1 656 projets) écraserait tous les autres.
  select label_fr,
         ((ln(n) - min(ln(n)) over ()) / nullif(max(ln(n)) over () - min(ln(n)) over (), 0))::real
  from comptes
  order by label_fr;
$$;

grant execute on function public.nuage_public(int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Les deux chiffres affichés publiquement sur l'accueil.
--
-- Depuis que les projets sont réservés aux membres, un visiteur ne peut
-- plus les compter lui-même : le compteur de la page d'accueil tombait à
-- zéro. Ces totaux n'exposent aucun contenu.
-- ---------------------------------------------------------------------
create or replace function public.compter_fonds()
returns table (projets bigint, mots_cles bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.projects where is_public),
    (select count(distinct k.id) from public.keywords k
       join public.project_keywords pk on pk.keyword_id = k.id);
$$;

grant execute on function public.compter_fonds() to anon, authenticated;
