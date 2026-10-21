-- CinéMatch : « Cinema Paradiso » est un titre de film, pas une manière de
-- projeter (Sarah, 21/10/2026) : écarté des propositions de « Si j'étais le
-- cinéma ». Les deux personnes gardent leur réponse.
insert into public.personality_libre_ecartees (question_key, texte, motif) values
  ('cinema', 'cinema paradiso', 'Titre de film, pas une manière de projeter (Sarah, 21/10/2026)')
on conflict do nothing;
