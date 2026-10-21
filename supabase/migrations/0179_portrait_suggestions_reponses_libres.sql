-- =====================================================================
-- CinéMatch : les réponses libres des autres, proposées en tapant
-- (21/10/2026, Sarah).
--
-- Une réponse libre ne rapproche deux personnes que si elles ont écrit
-- exactement la même chose : « breaking bad » (29) et « breaking bad -
-- vince gilligan » (14) ne se voient pas. En proposant, dans le champ de
-- droite, ce que d'autres ont déjà répondu à la question, on fait
-- converger les formulations — comme la liste de gauche.
--
-- Seules les réponses données par au moins deux personnes sont proposées
-- (coquilles et réponses trop personnelles restent à l'écart), les plus
-- fréquentes en premier, sans jamais dire qui.
-- =====================================================================

create or replace function public.suggestions_portrait()
returns table (question_key text, texte text, nombre int)
language sql
stable
security definer
set search_path = ''
as $$
  select k.key, substr(k.value, 7), count(*)::int
  from public.profiles p
  cross join lateral jsonb_each_text(p.personality_answers) k
  where p.personality_answers is not null
    and k.value like 'autre:%'
    and length(k.value) > 7
  group by k.key, substr(k.value, 7)
  having count(*) >= 2
  order by k.key, count(*) desc, substr(k.value, 7)
$$;

grant execute on function public.suggestions_portrait() to anon, authenticated;
