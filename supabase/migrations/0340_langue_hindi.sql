-- L'hindi rejoint les langues parlées (28/11/2026, Sarah : « indie »),
-- coché pour les profils situés en Inde, comme le turc pour la Turquie.

insert into public.languages (code, label_fr, label_en, position)
values ('hi', 'Hindi', 'Hindi', 13)
on conflict (code) do nothing;

insert into public.profile_languages (profile_id, language_code)
select id, 'hi' from public.profiles where country = 'IN'
on conflict do nothing;
