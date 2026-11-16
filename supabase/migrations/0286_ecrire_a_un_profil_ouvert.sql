-- Un profil ouvert avec un soleil (0285) : on peut écrire à ce talent,
-- hors projet, et lire cette conversation, même sans adhésion (comme un
-- projet ouvert avec un soleil, 0284). Fonctions reprises telles qu'en
-- base, condition élargie seulement.

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

CREATE OR REPLACE FUNCTION public.ouvrir_conversation(p_autre uuid, p_projet uuid)
 RETURNS TABLE(msg_id uuid, de_moi boolean, corps text, envoye_le timestamp with time zone, objet text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or not (public.a_une_adhesion_active(auth.uid())
      or (p_projet is not null and public.projet_ouvert_par_soleil(p_projet))
      or (p_projet is null and public.profil_ouvert_par_soleil(p_autre))) then
    return;
  end if;
  update public.project_messages
  set read_at = now()
  where recipient_id = auth.uid() and sender_id = p_autre
    and project_id is not distinct from p_projet and read_at is null;
  return query
    select m.id, m.sender_id = auth.uid(), m.body, m.created_at, m.objet
    from public.project_messages m
    where ((m.sender_id = auth.uid() and m.recipient_id = p_autre)
        or (m.sender_id = p_autre and m.recipient_id = auth.uid()))
      and m.project_id is not distinct from p_projet
    order by m.created_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mes_conversations()
 RETURNS TABLE(autre_id uuid, autre_nom text, projet_id uuid, projet_titre text, objet text, dernier_corps text, dernier_le timestamp with time zone, dernier_de_moi boolean, non_lus integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with msgs as (
    select m.*, case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as autre
    from public.project_messages m
    where m.sender_id = auth.uid() or m.recipient_id = auth.uid()
  ),
  derniers as (
    select distinct on (autre, project_id) autre, project_id, body, created_at, sender_id
    from msgs order by autre, project_id, created_at desc
  ),
  objets as (
    select distinct on (autre) autre, msgs.objet
    from msgs where project_id is null and msgs.objet is not null
    order by autre, created_at
  ),
  comptes as (
    select autre, project_id,
      (count(*) filter (where recipient_id = auth.uid() and read_at is null))::int as non_lus
    from msgs group by autre, project_id
  )
  select d.autre, coalesce(p.display_name, p.full_name, p.first_name), d.project_id, pr.title,
    case when d.project_id is null then o.objet end,
    d.body, d.created_at, d.sender_id = auth.uid(), c.non_lus
  from derniers d
  join comptes c on c.autre = d.autre and c.project_id is not distinct from d.project_id
  join public.profiles p on p.id = d.autre
  left join public.projects pr on pr.id = d.project_id
  left join objets o on o.autre = d.autre
  where public.a_une_adhesion_active(auth.uid())
     or (d.project_id is not null and public.projet_ouvert_par_soleil(d.project_id))
     or (d.project_id is null and public.profil_ouvert_par_soleil(d.autre))
  order by d.created_at desc;
$function$;
