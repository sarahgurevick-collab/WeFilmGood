-- =====================================================================
-- CinéMatch : un libellé d'affichage pour les réponses libres
-- (21/10/2026, Sarah : « L'Incompris », « Paris, Texas »).
--
-- Les réponses libres sont stockées sous une forme de comparaison :
-- minuscules, sans accents, sans article (« incompris », « petit prince »),
-- héritée de la reprise de WFG 1 — c'est ce qui permet à deux personnes
-- de se rejoindre. Mais c'est laid à l'écran. D'où :
--  1. une table de libellés (clé → « L'Incompris ») lue par les
--     propositions du champ libre ;
--  2. le déclencheur normalise désormais aussi un texte libre nouveau
--     (« L'Incompris » tapé aujourd'hui → « incompris »), sinon les
--     variantes avec accents ou article s'accumuleraient.
-- =====================================================================

create table if not exists public.personality_libre_libelles (
  question_key text not null references public.personality_questions(key) on delete cascade,
  texte        text not null,
  libelle      text not null,
  primary key (question_key, texte)
);
comment on table public.personality_libre_libelles is
  'CinéMatch : forme d''affichage d''une réponse libre (texte = la clé stockée après « autre: », libelle = « L''Incompris »).';
alter table public.personality_libre_libelles enable row level security;
drop policy if exists "libellés lisibles par tous" on public.personality_libre_libelles;
create policy "libellés lisibles par tous" on public.personality_libre_libelles for select using (true);

insert into public.personality_libre_libelles (question_key, texte, libelle) values
  ('film_prefere', 'incompris', 'L''Incompris'),
  ('film_prefere', 'paris, texas', 'Paris, Texas')
on conflict (question_key, texte) do update set libelle = excluded.libelle;

-- Le déclencheur (0178/0180) : une case si c'en est une, sinon un alias,
-- sinon la forme de comparaison du texte tapé.
create or replace function public.rattacher_reponses_portrait_trg()
returns trigger
language plpgsql
as $$
declare
  k text;
  v text;
  slug text;
  libre text;
  cle text;
  resultat jsonb := '{}'::jsonb;
begin
  if new.personality_answers is null or jsonb_typeof(new.personality_answers) <> 'object' then
    return new;
  end if;
  for k, v in select * from jsonb_each_text(new.personality_answers) loop
    if v like 'autre:%' then
      slug := public.rattacher_reponse_portrait(k, substr(v, 7));
      if slug is not null then
        v := slug;
      else
        cle := public.normaliser_reponse_portrait(substr(v, 7));
        select a.texte into libre from public.personality_libre_alias a
         where a.question_key = k and a.alias = cle;
        v := 'autre:' || coalesce(libre, cle);
      end if;
    end if;
    resultat := resultat || jsonb_build_object(k, v);
  end loop;
  new.personality_answers := resultat;
  return new;
end;
$$;

-- Les quelques réponses saisies sur WFG 2 avec un article ou des accents
-- prennent la forme de comparaison.
update public.profiles
   set personality_answers = personality_answers
 where exists (
   select 1 from jsonb_each_text(personality_answers) e
   where e.value like 'autre:%'
     and substr(e.value, 7) <> public.normaliser_reponse_portrait(substr(e.value, 7))
 );

-- Les propositions : la clé (pour rejoindre), le libellé (pour l'écran).
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
  order by t.question_key, t.nombre desc, t.texte
$$;
grant execute on function public.suggestions_portrait() to anon, authenticated;
