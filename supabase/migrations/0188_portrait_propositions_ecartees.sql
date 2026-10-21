-- =====================================================================
-- CinéMatch : des propositions écartées du champ libre (21/10/2026, Sarah).
--
-- « Si j'étais le cinéma, je serais… » attend une manière de projeter
-- (360, 3D, IMAX, Cinémascope, muet, Odorama) : « art et essai » n'y a pas
-- sa place, pas plus qu'un nom d'actrice dans la liste des acteurs. Une
-- proposition écartée n'est plus suggérée ; les réponses des personnes qui
-- l'ont donnée restent, et continuent de se rejoindre entre elles.
-- =====================================================================

create table if not exists public.personality_libre_ecartees (
  question_key text not null references public.personality_questions(key) on delete cascade,
  texte        text not null,
  motif        text,
  ecarte_le    timestamptz not null default now(),
  primary key (question_key, texte)
);
comment on table public.personality_libre_ecartees is
  'CinéMatch : réponses libres (clé stockée) qui ne sont plus proposées dans le champ libre, par décision de Sarah.';
alter table public.personality_libre_ecartees enable row level security;
drop policy if exists "écartées lisibles par tous" on public.personality_libre_ecartees;
create policy "écartées lisibles par tous" on public.personality_libre_ecartees for select using (true);

insert into public.personality_libre_ecartees (question_key, texte, motif) values
  ('cinema', 'art et essai', 'Pas une manière de projeter (Sarah, 21/10/2026)')
on conflict do nothing;

drop function if exists public.suggestions_portrait();
create function public.suggestions_portrait()
returns table (question_key text, texte text, libelle text, nombre int)
language sql
stable
security definer
set search_path = ''
as $$
  with reponses as (
    select k.key as question_key, substr(k.value, 7) as texte, count(*)::int as nombre
    from public.profiles p
    cross join lateral jsonb_each_text(p.personality_answers) k
    where p.personality_answers is not null
      and k.value like 'autre:%'
      and length(k.value) > 7
    group by k.key, substr(k.value, 7)
  ),
  tout as (
    select question_key, texte, nombre from reponses
    union all
    select question_key, texte, nombre from public.personality_libre_mentions
  ),
  total as (
    select question_key, texte, sum(nombre)::int as nombre
    from tout
    group by question_key, texte
    having sum(nombre) >= 2
  )
  select t.question_key, t.texte, coalesce(l.libelle, t.texte), t.nombre
  from total t
  left join public.personality_libre_libelles l
    on l.question_key = t.question_key and l.texte = t.texte
  where not exists (
    select 1 from public.personality_libre_ecartees e
    where e.question_key = t.question_key and e.texte = t.texte
  )
  -- Une mention qui est en fait une case de la liste (« en 3d ») n'a rien
  -- à faire dans le champ libre.
  and public.rattacher_reponse_portrait(t.question_key, t.texte) is null
  order by t.question_key, t.nombre desc, t.texte
$$;
grant execute on function public.suggestions_portrait() to anon, authenticated;

-- Correctif : suggestions_portrait tourne avec search_path vide et appelle
-- désormais rattacher_reponse_portrait → normaliser_reponse → unaccent, qui
-- n'était pas qualifié. On le qualifie (l'extension est dans public).
create or replace function public.normaliser_reponse(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(lower(public.unaccent(coalesce(t,''))), '^(du |de la |de l''|des |un |une |le |la |les |l'')', ''),
             '\s*/\s*', ' / ', 'g'),
           '\s+', ' ', 'g');
$$;
