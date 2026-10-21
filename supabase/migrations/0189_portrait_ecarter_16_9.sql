-- CinéMatch : « 16 / 9 » est un format d'image, pas une manière de projeter
-- (Sarah, 21/10/2026) : écarté des propositions de « Si j'étais le cinéma ».
insert into public.personality_libre_ecartees (question_key, texte, motif) values
  ('cinema', '16 / 9', 'Format d''image, pas une manière de projeter (Sarah, 21/10/2026)')
on conflict do nothing;
