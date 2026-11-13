-- La fiche du CinéCrush de la semaine s'ouvre à tous les membres, même
-- sans adhésion (13/11/2026, décision de Sarah) : c'est là que les
-- comédiens déposent leur ComedyPitch gratuitement « dans un premier
-- temps ». Dès que la semaine est finie, la fiche se referme toute seule.
--
-- On complète la fonction que consulte la règle de lecture des projets
-- (0260) : ouvert avec un soleil, invité dans l'équipe, ou CinéCrush de
-- la semaine en cours. Personnages et images suivent, comme avant.

create or replace function public.projet_ouvert_ou_equipe(p_project_id uuid) returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.gravity_ouvertures o
                 where o.profile_id = auth.uid() and o.project_id = p_project_id)
      or exists (select 1 from public.project_co_authors c
                 where c.profile_id = auth.uid() and c.project_id = p_project_id)
      or exists (select 1 from public.cinecrush k
                 where k.project_id = p_project_id and k.semaine = public.dimanche_de_la_semaine());
$$;
