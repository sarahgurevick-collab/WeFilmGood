-- Un lecteur qui n'a jamais coché de langue lit le français, et rien
-- d'autre (24/11/2026, Sarah). Jusqu'ici NULL voulait dire « toutes » :
-- 132 lecteurs sur 152 étaient proposés pour les projets en anglais.
-- Les langues cochées par le lecteur (ou reprises de WFG 1) ne bougent pas.
update public.reader_profiles set langues = '{fr}' where langues is null;

alter table public.reader_profiles alter column langues set default '{fr}';

comment on column public.reader_profiles.langues is
  'Langues de projet (fr, en, es, de, it, pt, ar) que le lecteur accepte de lire. Rien d''enregistré = français seulement ; {} = aucune.';
