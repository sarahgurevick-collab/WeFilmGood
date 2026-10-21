-- =====================================================================
-- CinéMatch : les réponses à plusieurs titres (21/10/2026, Sarah).
--
-- « friends, breaking bad et fargo » : la réponse de la personne est le
-- premier titre, « friends ». Les autres, « breaking bad » et « fargo »,
-- comptent chacun pour une mention : dès qu'un autre membre nomme « fargo »,
-- il atteint deux et entre dans les propositions du champ libre.
-- « breaking bad ou oz » : réponse « breaking bad », mention « oz ».
--
-- Les mentions vivent dans une table à part, ajoutées aux comptes de
-- suggestions_portrait() ; elles ne sont la réponse de personne et ne
-- servent pas au calcul des matchs.
-- =====================================================================

create table if not exists public.personality_libre_mentions (
  question_key text not null references public.personality_questions(key) on delete cascade,
  texte        text not null,
  nombre       int  not null default 1 check (nombre > 0),
  primary key (question_key, texte)
);
comment on table public.personality_libre_mentions is
  'CinéMatch : titres secondaires d''une réponse à plusieurs titres (« X, Y et Z » → Y et Z), comptés comme une mention chacun dans les propositions du champ libre. texte en minuscules, comme après « autre: ».';
alter table public.personality_libre_mentions enable row level security;
drop policy if exists "mentions lisibles par tous" on public.personality_libre_mentions;
create policy "mentions lisibles par tous" on public.personality_libre_mentions for select using (true);

-- Les deux cas : le premier titre devient la réponse (alias, déclencheur
-- 0180), les autres des mentions.
insert into public.personality_libre_alias (question_key, alias, texte) values
  ('serie', public.normaliser_reponse_portrait('friends, breaking bad et fargo'), 'friends'),
  ('serie', public.normaliser_reponse_portrait('breaking bad ou oz'), 'breaking bad')
on conflict do nothing;

insert into public.personality_libre_mentions (question_key, texte, nombre) values
  ('serie', 'breaking bad', 1),
  ('serie', 'fargo', 1),
  ('serie', 'oz', 1)
on conflict (question_key, texte) do update set nombre = public.personality_libre_mentions.nombre + excluded.nombre;

update public.profiles
   set personality_answers = personality_answers
 where personality_answers ->> 'serie' in ('autre:friends, breaking bad et fargo', 'autre:breaking bad ou oz');

-- Les propositions comptent les réponses ET les mentions.
create or replace function public.suggestions_portrait()
returns table (question_key text, texte text, nombre int)
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
  )
  select question_key, texte, sum(nombre)::int
  from tout
  group by question_key, texte
  having sum(nombre) >= 2
  order by question_key, sum(nombre) desc, texte
$$;
