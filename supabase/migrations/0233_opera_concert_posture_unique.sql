-- 04/11/2026, Sarah : deux sous-genres de plus pour Récit musical (Opéra,
-- Concert), et Fiction / Documentaire devient un choix unique (« l'un ou
-- l'autre »).
insert into public.sous_genres (slug, label_fr, familles, mots_cles, position) values
  ('opera',   'Opéra',   '{film_musical}', '{opéra}',   61),
  ('concert', 'Concert', '{film_musical}', '{concert}', 62)
on conflict (slug) do update set label_fr = excluded.label_fr, familles = excluded.familles,
  mots_cles = excluded.mots_cles, position = excluded.position;

-- Aucune fiche n'a les deux aujourd'hui ; par sécurité, on garde le premier.
update public.projects set postures = postures[1:1] where cardinality(postures) > 1;
alter table public.projects drop constraint if exists projects_posture_unique;
alter table public.projects add constraint projects_posture_unique
  check (postures is null or cardinality(postures) <= 1);
