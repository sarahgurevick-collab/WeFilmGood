-- 10/10/2026, trois décisions de Sarah.
--
-- 1. Écrire à un talent depuis son profil, sans passer par un projet. La
--    règle du 03/10 (« on ne contacte un talent qu'à propos d'un projet »)
--    forçait un monteur à créer un projet avant de chercher un chef
--    opérateur. Désormais une conversation a un objet : le projet quand on
--    écrit depuis sa fiche, sinon un objet saisi (le titre de son projet, le
--    plus souvent). Un message hors projet qui n'est pas une réponse doit
--    avoir un objet. Ce contact comptera comme un crédit quand les crédits
--    existeront.
-- 2. Les langues parlées de WFG 1 (6 201 profils) sont reprises ; l'arabe
--    rejoint la liste.
-- 3. Les profils repris de WFG 1 reçoivent leur catégorie d'après leur
--    métier de WFG 1. Les validations ne bougent pas.

-- 1. L'objet d'un message ---------------------------------------------------
alter table public.project_messages add column if not exists objet text;

drop function if exists public.envoyer_message(uuid, uuid, text);
create or replace function public.envoyer_message(p_destinataire uuid, p_projet uuid, p_corps text, p_objet text default null)
returns uuid language plpgsql security definer set search_path = public as $$
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

  insert into public.project_messages (project_id, sender_id, recipient_id, body, objet)
  values (p_projet, v_moi, p_destinataire, btrim(p_corps), case when p_projet is null then v_objet end)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.envoyer_message(uuid, uuid, text, text) to authenticated;

-- La liste des conversations : l'objet d'une conversation hors projet.
drop function if exists public.mes_conversations();
create or replace function public.mes_conversations()
returns table(autre_id uuid, autre_nom text, projet_id uuid, projet_titre text, objet text, dernier_corps text, dernier_le timestamptz, dernier_de_moi boolean, non_lus integer)
language sql stable security definer set search_path = public as $$
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
  order by d.created_at desc;
$$;
grant execute on function public.mes_conversations() to authenticated;

-- Une conversation : chaque message avec son objet.
drop function if exists public.ouvrir_conversation(uuid, uuid);
create or replace function public.ouvrir_conversation(p_autre uuid, p_projet uuid)
returns table(msg_id uuid, de_moi boolean, corps text, envoye_le timestamptz, objet text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.a_une_adhesion_active(auth.uid()) then
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
$$;
grant execute on function public.ouvrir_conversation(uuid, uuid) to authenticated;

-- Les messages en attente (sans adhésion) : l'objet se voit, comme le titre du projet.
drop view if exists public.mes_messages_recus;
create view public.mes_messages_recus with (security_invoker = false) as
  select m.id, m.project_id, p.title as project_title, m.objet, m.sender_id,
    case when public.a_une_adhesion_active(m.recipient_id) then coalesce(sp.display_name, sp.full_name) end as sender_name,
    m.created_at,
    case when public.a_une_adhesion_active(m.recipient_id) then m.body end as body,
    not public.a_une_adhesion_active(m.recipient_id) as verrouille
  from public.project_messages m
  left join public.projects p on p.id = m.project_id
  join public.profiles sp on sp.id = m.sender_id
  where m.recipient_id = auth.uid()
  order by m.created_at desc;
grant select on public.mes_messages_recus to authenticated;

-- 2. Les langues ------------------------------------------------------------
update public.languages set position = 11 where code = 'lsf';
insert into public.languages (code, label_fr, label_en, position)
values ('ar', 'Arabe', 'Arabic', 10)
on conflict (code) do nothing;

insert into public.profile_languages (profile_id, language_code)
select distinct p.id,
  case l.code when 'cn' then 'zh' when 'jp' then 'ja' else l.code end
from (
  select d.user_id, unnest(string_to_array(d.value, '|')) as code
  from wfg1.user_data d where d.name = 'spoken_languages'
) l
join public.profiles p on p.legacy_id::text = l.user_id::text
join public.languages g on g.code = case l.code when 'cn' then 'zh' when 'jp' then 'ja' else l.code end
where not exists (select 1 from public.profile_languages pl where pl.profile_id = p.id)
on conflict do nothing;

-- 3. Les catégories ---------------------------------------------------------
update public.profiles p
set category = (case a.role
    when 'producer' then 'producteur'
    when 'author' then 'auteur'
    when 'novelist' then 'auteur'
    when 'theater' then 'auteur'
    when 'comicbook' then 'auteur'
    else 'talent' end)::public.profile_category
from wfg1.accounts a
where a.user_id::text = p.legacy_id::text
  and p.category is null
  and a.role in ('producer', 'author', 'novelist', 'theater', 'comicbook', 'director', 'actor', 'composer',
                 'photodirector', 'editor', 'animator2d3d', 'soundengineer', 'hdecorator', 'sfxcreator');
