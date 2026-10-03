-- =====================================================================
-- Conversations (03/10/2026, Sarah).
--
-- « Mes messages » passe d'une liste de messages reçus à des
-- conversations : une ligne par correspondant et par projet, avec les
-- messages reçus ET envoyés, et la possibilité de répondre.
--
-- Règles posées par Sarah :
--   * lire et répondre demandent une adhésion active ; un auteur qui ne
--     veut pas adhérer à nouveau laisse le message sans réponse ;
--   * sans adhésion, on ne sait pas QUI a écrit (on sait seulement qu'un
--     message attend, c'est la raison d'adhérer) ;
--   * on ne contacte un talent qu'à propos d'un projet (à venir : un projet
--     « débloqué », cinq par semaine) ;
--   * les lecteurs sont introuvables : on ne peut pas leur écrire.
-- =====================================================================

-- Un message à un talent n'est pas « à propos » d'un projet.
alter table public.project_messages alter column project_id drop not null;

-- Le contenu et l'expéditeur d'un message reçu n'étaient protégés que par
-- la vue : la table, elle, se lisait en direct sans adhésion. Un message
-- reçu ne se lit plus en direct qu'avec une adhésion active (la vue
-- ci-dessous et les compteurs, en « security definer », ne sont pas
-- touchés).
drop policy if exists "l'expéditeur et le destinataire voient leurs messages" on public.project_messages;
create policy "l'expéditeur et le destinataire voient leurs messages"
  on public.project_messages for select
  using (
    sender_id = auth.uid()
    or (recipient_id = auth.uid() and public.a_une_adhesion_active(auth.uid()))
  );


-- Sans adhésion, le message est signalé mais son expéditeur reste inconnu.
create or replace view public.mes_messages_recus as
select
  m.id,
  m.project_id,
  p.title as project_title,
  m.sender_id,
  case when public.a_une_adhesion_active(m.recipient_id)
       then coalesce(sp.display_name, sp.full_name) else null end as sender_name,
  m.created_at,
  case when public.a_une_adhesion_active(m.recipient_id) then m.body else null end as body,
  not public.a_une_adhesion_active(m.recipient_id) as verrouille
from public.project_messages m
left join public.projects p on p.id = m.project_id
join public.profiles sp on sp.id = m.sender_id
where m.recipient_id = auth.uid()
order by m.created_at desc;

grant select on public.mes_messages_recus to authenticated;


-- Écrire, ou répondre : toutes les règles au même endroit.
create or replace function public.envoyer_message(
  p_destinataire uuid,
  p_projet uuid,
  p_corps text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
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
$$;

grant execute on function public.envoyer_message(uuid, uuid, text) to authenticated;


-- La liste : une ligne par correspondant et par projet, avec son nom
-- complet : écrire demande une adhésion, donc le contact est payé et son
-- nom est dû (Sarah, 03/10). Rien sans adhésion (les messages en attente
-- se montrent alors par la vue ci-dessus).
create or replace function public.mes_conversations()
returns table (
  autre_id uuid,
  autre_nom text,
  projet_id uuid,
  projet_titre text,
  dernier_corps text,
  dernier_le timestamptz,
  dernier_de_moi boolean,
  non_lus integer
)
language sql
stable
security definer
set search_path = public
as $$
  with msgs as (
    select
      m.*,
      case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as autre
    from public.project_messages m
    where m.sender_id = auth.uid() or m.recipient_id = auth.uid()
  ),
  derniers as (
    select distinct on (autre, project_id)
      autre, project_id, body, created_at, sender_id
    from msgs
    order by autre, project_id, created_at desc
  ),
  comptes as (
    select
      autre,
      project_id,
      (count(*) filter (where recipient_id = auth.uid() and read_at is null))::int as non_lus
    from msgs
    group by autre, project_id
  )
  select
    d.autre,
    coalesce(p.display_name, p.full_name, p.first_name),
    d.project_id,
    pr.title,
    d.body,
    d.created_at,
    d.sender_id = auth.uid(),
    c.non_lus
  from derniers d
  join comptes c on c.autre = d.autre and c.project_id is not distinct from d.project_id
  join public.profiles p on p.id = d.autre
  left join public.projects pr on pr.id = d.project_id
  where public.a_une_adhesion_active(auth.uid())
  order by d.created_at desc;
$$;

grant execute on function public.mes_conversations() to authenticated;


-- Ouvrir une conversation : ses messages, du plus ancien au plus récent.
-- Les messages reçus sont marqués lus, puisqu'ils viennent d'être lus
-- (jamais sans adhésion : rien ne revient, rien n'est marqué).
create or replace function public.ouvrir_conversation(p_autre uuid, p_projet uuid)
returns table (
  msg_id uuid,
  de_moi boolean,
  corps text,
  envoye_le timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.a_une_adhesion_active(auth.uid()) then
    return;
  end if;

  update public.project_messages
  set read_at = now()
  where recipient_id = auth.uid()
    and sender_id = p_autre
    and project_id is not distinct from p_projet
    and read_at is null;

  return query
    select m.id, m.sender_id = auth.uid(), m.body, m.created_at
    from public.project_messages m
    where (
        (m.sender_id = auth.uid() and m.recipient_id = p_autre)
        or (m.sender_id = p_autre and m.recipient_id = auth.uid())
      )
      and m.project_id is not distinct from p_projet
    order by m.created_at;
end;
$$;

grant execute on function public.ouvrir_conversation(uuid, uuid) to authenticated;
