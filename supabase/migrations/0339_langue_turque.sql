-- Le turc rejoint les langues parlées (28/11/2026, Sarah : « j'ai pas mal
-- d'auteurs turcs »). La liste est lue dans la base partout sur le site.

insert into public.languages (code, label_fr, label_en, position)
values ('tr', 'Turc', 'Turkish', 12)
on conflict (code) do nothing;
