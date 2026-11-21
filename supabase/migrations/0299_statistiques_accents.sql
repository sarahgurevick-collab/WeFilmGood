-- Statistiques : un mot-clé écrit avec ou sans accent compte pour un seul
-- (demande de Sarah, 21/11/2026) : « etudiant » et « étudiant », « soeur »
-- et « sœur », « liberte » et « liberté ». Comme pour le singulier et le
-- pluriel (0298), rien n'est réécrit : les formes sont réunies au moment
-- du comptage, et c'est la forme accentuée qui s'affiche.
-- Les faux jumeaux gardent leur accent, donc restent à part :
-- divorcé/divorce, retraité/retraite, marché/marche, péché/pêche, curé/cure…
create or replace function public.cle_singulier(p_mot text)
returns text language sql immutable set search_path = public
as $$
  with s as (
    -- le s ou le x final de chaque mot d'au moins quatre lettres, sauf les faux pluriels
    select regexp_replace(
             lower(p_mot),
             '\m(?!(?:paris|fils|cannes|échecs|urgences|tours|lumières|baskets|esprits)\M)(\w{3,})[sx]\M',
             '\1', 'g') as k
  )
  select case
           when k in ('divorcé','retraité','retraitée','jeûne','marché','ruiné','péché','naufragé','curé',
                      'complexé','équilibré','barbès','mâcon','bouclé','interné','marié','caché','éclipsé','crête')
           then k
           else translate(replace(replace(k, 'œ', 'oe'), 'æ', 'ae'),
                          'àâäéèêëîïôöùûüçÿ', 'aaaeeeeiioouuucy')
         end
    from s;
$$;

-- Pour chaque forme qui a une jumelle : la forme retenue — d'abord la mieux
-- accentuée, puis la plus employée, à égalité la plus courte.
create or replace function public.mots_cles_formes_retenues()
returns table (forme text, retenue text)
language sql stable security definer set search_path = public
as $$
  with voc as (
    select lower(x.mot) as mot, count(*) as n from (
      select mot from films_cnc_mots_cles
      union all select mot from archives_mots_cles
      union all select k.label_fr from project_keywords pk join keywords k on k.id = pk.keyword_id
    ) x group by 1
  ),
  cles as (select v.mot, v.n, cle_singulier(v.mot) as cle from voc v),
  classees as (
    select c.mot, c.cle,
           first_value(c.mot) over (
             partition by c.cle
             order by length(regexp_replace(c.mot, '[^àâäéèêëîïôöùûüçÿœæ]', '', 'g')) desc,
                      c.n desc, length(c.mot), c.mot) as retenue,
           count(*) over (partition by c.cle) as formes
      from cles c
  )
  select mot, retenue from classees where formes > 1;
$$;
revoke all on function public.mots_cles_formes_retenues() from public, anon, authenticated;
