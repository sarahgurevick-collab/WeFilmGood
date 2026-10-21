-- =====================================================================
-- CinéMatch : les propositions épinglées par Sarah (21/10/2026).
--
-- Règle : les propositions que Sarah donne sont toujours affichées dans le
-- champ libre, en premier et dans son ordre, avec son libellé, quel que
-- soit le nombre de personnes ; les autres suivent la règle « au moins
-- deux personnes ». Question 1 (« Si j'étais le cinéma, je serais… ») :
-- 35mm (3/2), 70mm, 16/9, 4/3, 125 images/sec, Art & Essai, VOD.
-- « Art et essai » et « 16 / 9 », écartés plus tôt dans la journée, sont
-- rétablis : « si la personne souhaite le choisir, pourquoi pas ».
-- =====================================================================

create table if not exists public.personality_libre_epinglees (
  question_key text not null references public.personality_questions(key) on delete cascade,
  texte        text not null,
  libelle      text not null,
  position     int  not null default 0,
  primary key (question_key, texte)
);
comment on table public.personality_libre_epinglees is
  'CinéMatch : propositions du champ libre toujours affichées (décision de Sarah), en tête et dans l''ordre de position. texte = clé stockée, libelle = forme affichée.';
alter table public.personality_libre_epinglees enable row level security;
drop policy if exists "épinglées lisibles par tous" on public.personality_libre_epinglees;
create policy "épinglées lisibles par tous" on public.personality_libre_epinglees for select using (true);

delete from public.personality_libre_ecartees where question_key = 'cinema' and texte in ('art et essai', '16 / 9');

insert into public.personality_libre_epinglees (question_key, texte, libelle, position) values
  ('cinema', public.normaliser_reponse_portrait('35mm (3/2)'),      '35mm (3/2)',      1),
  ('cinema', public.normaliser_reponse_portrait('70mm'),            '70mm',            2),
  ('cinema', public.normaliser_reponse_portrait('16/9'),            '16/9',            3),
  ('cinema', public.normaliser_reponse_portrait('4/3'),             '4/3',             4),
  ('cinema', public.normaliser_reponse_portrait('125 images/sec'),  '125 images/sec',  5),
  ('cinema', 'art et essai',                                        'Art & Essai',     6),
  ('cinema', public.normaliser_reponse_portrait('VOD'),             'VOD',             7)
on conflict (question_key, texte) do update set libelle = excluded.libelle, position = excluded.position;

-- Le libellé affiché partout (champ prérempli, réplique du profil) suit.
insert into public.personality_libre_libelles (question_key, texte, libelle)
select question_key, texte, libelle from public.personality_libre_epinglees
on conflict (question_key, texte) do update set libelle = excluded.libelle;

-- Les anciennes écritures rejoignent les lignes de Sarah.
insert into public.personality_libre_alias (question_key, alias, texte)
select 'cinema', public.normaliser_reponse_portrait(a.alias), a.texte
from (values
  ('en 35 mm',                              public.normaliser_reponse_portrait('35mm (3/2)')),
  ('35 mm',                                 public.normaliser_reponse_portrait('35mm (3/2)')),
  ('en 3 / 2',                              public.normaliser_reponse_portrait('35mm (3/2)')),
  ('3/2',                                   public.normaliser_reponse_portrait('35mm (3/2)')),
  ('en 70 mm',                              public.normaliser_reponse_portrait('70mm')),
  ('70 mm',                                 public.normaliser_reponse_portrait('70mm')),
  ('en 16/9',                               public.normaliser_reponse_portrait('16/9')),
  ('en 4 / 3',                              public.normaliser_reponse_portrait('4/3')),
  ('en 124 i / sec',                        public.normaliser_reponse_portrait('125 images/sec')),
  ('art & essai',                           'art et essai'),
  ('arts et essai',                         'art et essai'),
  ('cinema d''art et essai',                'art et essai'),
  ('salle arts et essai',                   'art et essai'),
  ('disponible a la fois en salle et en vod', public.normaliser_reponse_portrait('VOD'))
) as a(alias, texte)
on conflict (question_key, alias) do nothing;

update public.profiles set personality_answers = personality_answers
 where personality_answers ->> 'cinema' like 'autre:%';

-- Les propositions : les épinglées d'abord, dans l'ordre de Sarah, puis
-- les autres par fréquence (au moins deux personnes), hors écartées.
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
  ),
  retenues as (
    select e.question_key, e.texte, e.libelle, coalesce(t.nombre, 0) as nombre, e.position
    from public.personality_libre_epinglees e
    left join total t on t.question_key = e.question_key and t.texte = e.texte
    union all
    select t.question_key, t.texte, coalesce(l.libelle, t.texte), t.nombre, null::int
    from total t
    left join public.personality_libre_libelles l
      on l.question_key = t.question_key and l.texte = t.texte
    where t.nombre >= 2
      and not exists (select 1 from public.personality_libre_epinglees e
                       where e.question_key = t.question_key and e.texte = t.texte)
      and not exists (select 1 from public.personality_libre_ecartees x
                       where x.question_key = t.question_key and x.texte = t.texte)
      and public.rattacher_reponse_portrait(t.question_key, t.texte) is null
  )
  select question_key, texte, libelle, nombre
  from retenues
  order by question_key, position nulls last, nombre desc, texte
$$;
grant execute on function public.suggestions_portrait() to anon, authenticated;
