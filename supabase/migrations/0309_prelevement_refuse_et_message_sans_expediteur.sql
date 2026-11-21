-- Sarah, 21/11/2026.
--
-- 1. Adhésion au mois : un prélèvement refusé arrête l'adhésion au bout de
--    7 jours. HelloAsso prélève les 11 mensualités ; le site relit leur
--    état toutes les heures (rattrapage). Le jour où un refus est repéré
--    est noté ; 7 jours plus tard, si rien n'est régularisé, l'adhésion
--    passe « expiree » et le jour de l'arrêt est noté. Une adhésion
--    arrêtée ainsi puis rétablie à la main n'est plus arrêtée toute seule.
alter table public.memberships
  add column if not exists prelevement_refuse_le timestamptz,
  add column if not exists arretee_pour_impaye_le timestamptz;

comment on column public.memberships.prelevement_refuse_le is
  'Jour où le site a repéré un prélèvement mensuel refusé chez HelloAsso (vide si tout est payé).';
comment on column public.memberships.arretee_pour_impaye_le is
  'Jour où l''adhésion a été arrêtée, 7 jours après un prélèvement refusé non régularisé.';

-- 2. Messagerie sans adhésion : le membre lit le message qu'il a reçu,
--    mais ne sait pas qui l'a écrit et ne peut pas répondre (avant : il
--    savait seulement qu'un message attendait). Le nom reste réservé aux
--    adhérents ; répondre passe toujours par envoyer_message, qui exige
--    l'adhésion.
drop view if exists public.mes_messages_recus;
create view public.mes_messages_recus with (security_invoker = false) as
  select m.id, m.project_id, p.title as project_title, m.objet, m.sender_id,
    case when public.a_une_adhesion_active(m.recipient_id) then coalesce(sp.display_name, sp.full_name) end as sender_name,
    m.created_at,
    m.body,
    not public.a_une_adhesion_active(m.recipient_id) as verrouille
  from public.project_messages m
  left join public.projects p on p.id = m.project_id
  join public.profiles sp on sp.id = m.sender_id
  where m.recipient_id = auth.uid()
  order by m.created_at desc;
grant select on public.mes_messages_recus to authenticated;
