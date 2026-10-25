-- Le ruban ne porte que nos propres sélections (25/10/2026, Sarah : « On ne
-- garde que notre sélection dans le ribbon. Par contre si le projet a eu des
-- prix ailleurs c'est inscrit sous le titre. ») : « Script primé » disparaît
-- comme « Film primé » (0207). Son seul projet, Familia Kwaconga (FEMI),
-- reprend « Sélectionné » ; Signé et Tourné restent.

update public.projects
   set bandeau = case when public.a_une_selection_mds(id) then 'selection_mds' else null end
 where bandeau = 'script_prime';

alter table public.projects drop constraint if exists projects_bandeau_check;
alter table public.projects add constraint projects_bandeau_check
  check (bandeau in ('signe', 'tourne', 'selection_mds'));
