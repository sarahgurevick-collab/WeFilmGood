-- CinéMatch : « paris texas » (2) rejoint « paris, texas » (3) — même film,
-- signalé lors du tri à la main du 21/10/2026.
insert into public.personality_libre_alias (question_key, alias, texte)
values ('film_prefere', public.normaliser_reponse_portrait('paris texas'), 'paris, texas')
on conflict do nothing;
update public.profiles set personality_answers = personality_answers
 where personality_answers ->> 'film_prefere' = 'autre:paris texas';
