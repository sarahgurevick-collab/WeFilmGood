-- Écrire à l'auteur de son match (Sarah, 23/11/2026) : réservé aux
-- adhérents, sans soleil, avec la règle du CinéCrush (0280) — un seul
-- message tant que l'autre n'a pas répondu. Seule la branche « match »
-- est ajoutée à peut_ecrire_sur_projet ; le reste est inchangé.
CREATE OR REPLACE FUNCTION public.peut_ecrire_sur_projet(p_project_id uuid, p_destinataire uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when auth.uid() is null then 'non'
    when public.is_admin() then 'oui'
    -- Le porteur répond librement.
    when exists (select 1 from public.projects pr where pr.id = p_project_id and pr.owner_id = auth.uid()) then 'oui'
    -- Projet ouvert avec un soleil : sans limite.
    when exists (select 1 from public.gravity_ouvertures o
                 where o.profile_id = auth.uid() and o.project_id = p_project_id) then 'oui'
    -- L'autre m'a écrit sur ce projet : la conversation continue.
    when exists (select 1 from public.project_messages m
                 where m.project_id = p_project_id and m.sender_id = p_destinataire and m.recipient_id = auth.uid()) then 'oui'
    -- J'ai déjà écrit, sans réponse : un seul message.
    when exists (select 1 from public.project_messages m
                 where m.project_id = p_project_id and m.sender_id = auth.uid() and m.recipient_id = p_destinataire) then 'attendre'
    -- CinéCrush de la semaine, pour un adhérent : le premier message.
    when public.cinecrush_ouvert_pour_moi(p_project_id) then 'oui'
    -- Le match d'un de mes projets, pour un adhérent : le premier message (23/11).
    when public.a_une_adhesion_active(auth.uid()) and exists (
           select 1 from public.projets_matchs pm
             join public.projects mien on mien.id = pm.project_id
            where mien.owner_id = auth.uid() and pm.match_id = p_project_id) then 'oui'
    else 'non'
  end;
$function$;

notify pgrst, 'reload schema';
