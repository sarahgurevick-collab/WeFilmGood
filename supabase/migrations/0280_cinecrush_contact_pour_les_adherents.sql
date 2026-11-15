-- Le CinéCrush de la semaine : les adhérents peuvent contacter son équipe
-- sans dépenser de soleil (15/11/2026, décision de Sarah : « l'adhésion
-- donnerait les contacts partout »).
--   · pendant sa semaine, le projet CinéCrush montre à l'adhérent les noms
--     et les photos de l'équipe, et l'enveloppe du porteur s'ouvre ;
--   · un seul message au porteur tant qu'il n'a pas répondu ; dès qu'il
--     répond, la conversation continue normalement, même la semaine finie ;
--   · les autres talents de l'équipe s'écrivent comme avant, depuis leur
--     profil (seuls ceux qui ont un profil rattaché au projet ont une
--     enveloppe) ;
--   · sans adhésion, rien ne change : pas de noms, pas de contact.

-- Le projet est-il le CinéCrush de la semaine, et moi adhérent ?
create or replace function public.cinecrush_ouvert_pour_moi(p_project_id uuid) returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null
     and p_project_id = public.cinecrush_en_cours()
     and public.a_une_adhesion_active(auth.uid());
$$;

-- Puis-je écrire à ce membre à propos de ce projet ? 'oui', 'attendre'
-- (j'ai écrit sans l'avoir ouvert avec un soleil, il n'a pas encore
-- répondu) ou 'non' (projet à ouvrir). La page et l'envoi lisent la même règle.
create or replace function public.peut_ecrire_sur_projet(p_project_id uuid, p_destinataire uuid) returns text
 language sql stable security definer set search_path to 'public' as $$
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
    else 'non'
  end;
$$;
revoke all on function public.cinecrush_ouvert_pour_moi(uuid), public.peut_ecrire_sur_projet(uuid, uuid) from anon;
grant execute on function public.cinecrush_ouvert_pour_moi(uuid), public.peut_ecrire_sur_projet(uuid, uuid) to authenticated;

-- L'équipe : les noms aussi pour l'adhérent, sur le CinéCrush de la semaine.
create or replace function public.equipe_projet(p_project_id uuid)
 returns table(profile_id uuid, nom text, role text, avatar_url text, est_auteur boolean)
 language sql stable security definer set search_path to 'public' as $function$
  with droit as (
    select auth.uid() is not null and (
      is_admin()
      or exists (select 1 from public.gravity_ouvertures o where o.profile_id = auth.uid() and o.project_id = p_project_id)
      or exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid())
      or exists (select 1 from public.project_co_authors c
                 where c.project_id = p_project_id and c.profile_id = auth.uid() and c.status = 'accepte')
      or public.cinecrush_ouvert_pour_moi(p_project_id)
    ) as voit_les_noms
  )
  select pr.id,
         case when (select voit_les_noms from droit) or pr.id = auth.uid()
              then coalesce(nullif(btrim(pr.display_name), ''), pr.full_name) end,
         (select r.label_fr from public.profile_roles x
          join public.roles r on r.slug = x.role_slug
          where x.profile_id = pr.id
          order by r.position limit 1),
         pr.avatar_url,
         true
  from public.projects p
  join public.profiles pr on pr.id = p.owner_id
  where p.id = p_project_id and auth.uid() is not null
  union all
  select pr.id,
         case when (select voit_les_noms from droit) or pr.id = auth.uid()
              then coalesce(nullif(btrim(pr.display_name), ''), pr.full_name) end,
         r.label_fr,
         pr.avatar_url,
         false
  from public.project_co_authors c
  join public.profiles pr on pr.id = c.profile_id
  left join public.roles r on r.slug = c.role_slug
  where c.project_id = p_project_id
    and c.status = 'accepte'
    and coalesce(nullif(btrim(pr.display_name), ''), nullif(btrim(pr.full_name), '')) is not null
    and auth.uid() is not null;
$function$;

-- L'envoi : même fonction qu'au 12/11 (0259), la règle « projet à ouvrir »
-- passe par peut_ecrire_sur_projet().
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
  if not (public.a_une_adhesion_active(v_moi) or public.is_admin()) then
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
