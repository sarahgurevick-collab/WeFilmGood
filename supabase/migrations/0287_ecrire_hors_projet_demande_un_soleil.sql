-- Écrire à un talent depuis son profil coûte un soleil (16/11/2026,
-- Sarah : « j'ai envoyé le message sans utiliser mon crédit »). Fonction
-- reprise telle qu'en base, avec la nouvelle règle avant celle des projets.

CREATE OR REPLACE FUNCTION public.envoyer_message(p_destinataire uuid, p_projet uuid, p_corps text, p_objet text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_moi uuid := auth.uid();
  v_id uuid;
  v_objet text := nullif(btrim(coalesce(p_objet, '')), '');
begin
  if v_moi is null then
    raise exception 'connexion requise';
  end if;
  if p_corps is null or btrim(p_corps) = '' then
    raise exception 'message vide';
  end if;
  if p_destinataire is null or p_destinataire = v_moi then
    raise exception 'destinataire invalide';
  end if;
  -- Sans adhésion, on écrit seulement à propos d'un projet ouvert avec un
  -- soleil (Pack Soleils, 16/11, Sarah : « Oui, à l'auteur »).
  if not (public.a_une_adhesion_active(v_moi) or public.is_admin()
          or (p_projet is not null and public.projet_ouvert_par_soleil(p_projet))
          or (p_projet is null and public.profil_ouvert_par_soleil(p_destinataire))) then
    raise exception 'adhésion requise';
  end if;

  -- Un lecteur est introuvable : on ne lui écrit pas.
  if not exists (select 1 from public.profiles where id = p_destinataire)
     or exists (select 1 from public.profile_roles where profile_id = p_destinataire and role_slug = 'lecteur') then
    raise exception 'destinataire introuvable';
  end if;

  -- Messagerie fermée (08/10) : on peut toujours répondre à qui a écrit le premier.
  if public.messagerie_fermee(p_destinataire) and not exists (
    select 1 from public.project_messages m
    where m.sender_id = p_destinataire and m.recipient_id = v_moi
  ) then
    raise exception 'indisponible';
  end if;

  -- Hors projet (10/10) : un premier message porte un objet ; une réponse n'en a pas besoin.
  if p_projet is null and v_objet is null and not exists (
    select 1 from public.project_messages m
    where m.project_id is null
      and ((m.sender_id = p_destinataire and m.recipient_id = v_moi)
        or (m.sender_id = v_moi and m.recipient_id = p_destinataire))
  ) then
    raise exception 'objet requis';
  end if;

  -- Hors projet, un premier message demande d'avoir ouvert le profil du
  -- talent avec un soleil (16/11, Sarah : le message était parti sans
  -- dépenser de soleil). Passent : l'administration, une conversation déjà
  -- commencée entre les deux, et l'équipe d'un projet ouvert avec un soleil.
  if p_projet is null and not public.is_admin()
     and not public.profil_ouvert_par_soleil(p_destinataire)
     and not exists (
       select 1 from public.project_messages m
       where (m.sender_id = p_destinataire and m.recipient_id = v_moi)
          or (m.sender_id = v_moi and m.recipient_id = p_destinataire))
     and not exists (
       select 1 from public.gravity_ouvertures o
       join public.projects pr on pr.id = o.project_id
       where o.profile_id = v_moi
         and (pr.owner_id = p_destinataire
           or exists (select 1 from public.project_co_authors c
                      where c.project_id = pr.id and c.profile_id = p_destinataire and c.status = 'accepte')))
  then
    raise exception 'profil à ouvrir';
  end if;

  -- À propos d'un projet : on écrit à son auteur, ou l'auteur répond.
  if p_projet is not null and not exists (
    select 1 from public.projects pr
    where pr.id = p_projet
      and (pr.owner_id = p_destinataire
        or (pr.owner_id = v_moi and exists (
          select 1 from public.project_messages m
          where m.project_id = p_projet and m.sender_id = p_destinataire and m.recipient_id = v_moi)))
  ) then
    raise exception 'projet invalide';
  end if;

  -- Écrire au porteur d'un projet : l'avoir ouvert avec un soleil (12/11),
  -- ou être adhérent pendant sa semaine CinéCrush (15/11, un seul message
  -- tant qu'il n'a pas répondu).
  if p_projet is not null and public.peut_ecrire_sur_projet(p_projet, p_destinataire) <> 'oui' then
    raise exception 'projet à ouvrir';
  end if;

  insert into public.project_messages (project_id, sender_id, recipient_id, body, objet)
  values (p_projet, v_moi, p_destinataire, btrim(p_corps), case when p_projet is null then v_objet end)
  returning id into v_id;
  return v_id;
end;
$function$;
