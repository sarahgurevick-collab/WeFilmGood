-- Films proches d'un projet (décision de Sarah, 21/11/2026) : rapprocher
-- un projet, ou quelques thèmes tapés à la main, des films déjà sortis,
-- par leurs mots-clés communs — comme le portrait chinois rapproche deux
-- talents. Administration seulement (décision du 06/11 sur les films du CNC).
-- Les mots rares pèsent plus que les mots courants : partager « gens du
-- voyage » rapproche bien plus que partager « drame ».

-- Le titre tel qu'on l'écrit (celui du CNC est en capitales, article à la fin).
alter table public.films_cnc add column if not exists titre_affiche text;

-- La clé de rapprochement de chaque mot (singulier, sans accent : 0298-0299),
-- gardée dans la table pour chercher vite. Si cle_singulier change, la
-- recalculer : update films_cnc_mots_cles set mot = mot;
alter table public.films_cnc_mots_cles
  add column if not exists cle text generated always as (public.cle_singulier(mot)) stored;
create index if not exists films_cnc_mots_cles_cle on public.films_cnc_mots_cles (cle);
-- Les mots de la clé un par un (« deuil du père » → deuil, du, père), pour
-- retrouver vite un mot contenu dans un autre ; de même pour le résumé.
alter table public.films_cnc_mots_cles
  add column if not exists cle_mots text[]
  generated always as (regexp_split_to_array(public.cle_singulier(mot), '[^[:alnum:]]+')) stored;
create index if not exists films_cnc_mots_cles_cle_mots on public.films_cnc_mots_cles using gin (cle_mots);
alter table public.films_cnc
  add column if not exists resume_mots text[]
  generated always as (regexp_split_to_array(public.cle_singulier(resume), '[^[:alnum:]]+')) stored;
create index if not exists films_cnc_resume_mots on public.films_cnc using gin (resume_mots);

-- p_project : un projet (ses mots-clés) ; p_mots : des thèmes tapés à la
-- main ; l'un, l'autre ou les deux. Un mot du film compte en entier s'il
-- est le même, à moitié s'il le contient ou y est contenu (« deuil » et
-- « deuil du père ») ; un thème tapé compte aussi à moitié s'il se lit
-- dans le résumé. Le poids d'un mot est le carré de sa rareté : un mot
-- porté par 5 films pèse près de trente fois plus que « comédie ».
create or replace function public.films_proches(
  p_project uuid default null,
  p_mots text[] default null,
  p_limite int default 30
)
returns table (
  film_id bigint, titre text, annee int, realisateur text, genre text,
  tmdb_id int, resume text, score real, mots_communs text[], mots_film text[]
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
         (select array_agg(m.mot order by m.mot) from films_cnc_mots_cles m where m.film_id = f.id)
    from scores s
    join films_cnc f on f.id = s.film_id
   order by s.score desc, f.id
   limit greatest(1, least(coalesce(p_limite, 30), 100));
end;
$$;

revoke all on function public.films_proches(uuid, text[], int) from public, anon;
grant execute on function public.films_proches(uuid, text[], int) to authenticated;
