-- Disponibilité de la messagerie (08/10/2026, étape 1 du test de Sarah) :
-- un producteur ou un comédien peut fermer sa messagerie « momentanément »
-- (très sollicité). Les autres talents ne sont pas concernés. La fermeture
-- est aussi tenue ici, dans l'envoi : le bouton barré ne suffit pas.
-- Rien de payant à cette étape (les Gooders viendront plus tard).
alter table public.profiles add column if not exists messages_ouverts boolean not null default true;

-- Producteur ou comédien : par la catégorie du profil, un métier choisi sur
-- WFG 2, ou un métier repris de WFG 1.
create or replace function public.messagerie_surveillee(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and category::text = 'producteur')
      or exists (select 1 from public.profile_roles where profile_id = uid and role_slug in ('producteur', 'comedien'))
      or exists (select 1 from public.wfg1_metiers_membres where profile_id = uid and slug in ('producteur', 'comedien'));
$$;

create or replace function public.messagerie_fermee(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select not messages_ouverts from public.profiles where id = uid), false)
     and public.messagerie_surveillee(uid);
$$;
grant execute on function public.messagerie_surveillee(uuid), public.messagerie_fermee(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.envoyer_message(p_destinataire uuid, p_projet uuid, p_corps text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_moi uuid := auth.uid();
  v_id uuid;
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
     or exists (
       select 1 from public.profile_roles
       where profile_id = p_destinataire and role_slug = 'lecteur'
     ) then
    raise exception 'destinataire introuvable';
  end if;

  -- Messagerie fermée (08/10) : un producteur ou un comédien très sollicité
  -- peut la fermer. On peut toujours lui répondre s'il a écrit le premier ;
  -- lui, fermé, peut écrire.
  if public.messagerie_fermee(p_destinataire) and not exists (
    select 1 from public.project_messages m
    where m.sender_id = p_destinataire and m.recipient_id = v_moi
  ) then
    raise exception 'indisponible';
  end if;

  -- Sans projet : seulement pour répondre à quelqu'un qui nous a écrit. On
  -- ne contacte un talent qu'à propos d'un projet (Sarah, 03/10) ; la règle
  -- du projet « débloqué » s'ajoutera avec les cinq visionnages par semaine.
  if p_projet is null and not exists (
    select 1 from public.project_messages m
    where m.project_id is null
      and m.sender_id = p_destinataire
      and m.recipient_id = v_moi
  ) then
    raise exception 'projet requis';
  end if;

  -- À propos d'un projet : on écrit à son auteur, ou l'auteur répond à
  -- quelqu'un qui lui a écrit à ce sujet.
  if p_projet is not null and not exists (
    select 1 from public.projects pr
    where pr.id = p_projet
      and (
        pr.owner_id = p_destinataire
        or (
          pr.owner_id = v_moi
          and exists (
            select 1 from public.project_messages m
            where m.project_id = p_projet
              and m.sender_id = p_destinataire
              and m.recipient_id = v_moi
          )
        )
      )
  ) then
    raise exception 'projet invalide';
  end if;

  insert into public.project_messages (project_id, sender_id, recipient_id, body)
  values (p_projet, v_moi, p_destinataire, btrim(p_corps))
  returning id into v_id;

  return v_id;
end;
$function$;
