-- Films primés (Sarah, 22/11/2026) : tous les prix connus de Wikidata, rapprochés
-- par l'identifiant TMDB. Colonne prix = liste des récompenses (null = aucun prix connu).
-- Données posées le 22/11 depuis Wikidata (P166 « distinction reçue » × P4947 TMDB) : 2 642 films.
alter table films_cnc add column if not exists prix text[];

drop function if exists public.films_proches(uuid, text[], int, text);

CREATE OR REPLACE FUNCTION public.films_proches(p_project uuid DEFAULT NULL::uuid, p_mots text[] DEFAULT NULL::text[], p_limite integer DEFAULT 30, p_origine text DEFAULT NULL::text, p_primes boolean DEFAULT false)
 RETURNS TABLE(film_id bigint, titre text, annee integer, realisateur text, genre text, tmdb_id integer, resume text, score real, mots_communs text[], mots_film text[], diffusion_autorisee boolean, partenaire text, lien text, pays text, source text, pourcent integer, prix text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         f.diffusion_autorisee, f.partenaire, f.lien, f.pays, f.source,
         least(100, round(100 * s.score / nullif((select sum(d.poids) from rarete d), 0)))::int,
         f.prix
    from scores s
    join films_cnc f on f.id = s.film_id
   -- les films à diffusion autorisée restent toujours visibles
   where (not coalesce(p_primes, false) or f.prix is not null)
     and (f.diffusion_autorisee
      or p_origine is null
      or (p_origine = 'etranger' and f.source = 'tmdb' and coalesce(f.pays, '') not like 'FR%')
      or (p_origine = 'france' and (f.source <> 'tmdb' or f.pays like 'FR%')))
   order by s.score desc, f.id
   limit greatest(1, least(coalesce(p_limite, 30), 100));
end;
$function$;
