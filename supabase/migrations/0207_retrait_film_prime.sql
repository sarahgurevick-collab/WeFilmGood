-- « Primé » est réservé au scénario (25/10/2026, Sarah) : le bandeau
-- « Film primé » disparaît, ses projets passent en « Tourné ».

update public.projects set bandeau = 'tourne' where bandeau = 'film_prime';

alter table public.projects drop constraint if exists projects_bandeau_check;
alter table public.projects add constraint projects_bandeau_check
  check (bandeau in ('signe', 'tourne', 'script_prime', 'selection_mds'));
