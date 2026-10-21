-- =====================================================================
-- CinéMatch : « titre - auteur » rejoint le titre seul (21/10/2026, Sarah,
-- après « breaking bad »). Pour une même question, quand une réponse libre
-- « X - Y » donnée par au moins deux personnes coexiste avec « X » seul,
-- « X - Y » devient un alias de « X » : « twin peaks - david lynch » →
-- « twin peaks », « hamlet - shakespeare » → « hamlet »… 33 couples, 94
-- réponses. Le titre seul est sans ambiguïté dans tous ces cas.
--
-- Les alias sont calculés sur les réponses du moment : rejouable après la
-- réimportation finale de WFG 1 (il en trouvera peut-être d'autres).
-- Sauvegarde des réponses : personality_answers_sauvegarde_0178.
-- =====================================================================

insert into public.personality_libre_alias (question_key, alias, texte)
with r as (
  select k.key, substr(k.value, 7) as t, count(*) as n
  from public.profiles p, jsonb_each_text(p.personality_answers) k
  where k.value like 'autre:%'
  group by 1, 2
),
long as (
  select key, t, n, trim(split_part(t, ' - ', 1)) as base
  from r
  where t like '% - %'
)
select l.key, public.normaliser_reponse_portrait(l.t), b.t
from long l
join r b on b.key = l.key and b.t = l.base
where l.n >= 2
  and l.base <> ''
on conflict (question_key, alias) do nothing;

-- Les réponses existantes passent dans le déclencheur (0178/0180).
update public.profiles
   set personality_answers = personality_answers
 where exists (
   select 1
   from jsonb_each_text(personality_answers) e
   join public.personality_libre_alias a
     on a.question_key = e.key
    and e.value like 'autre:%'
    and a.alias = public.normaliser_reponse_portrait(substr(e.value, 7))
 );
