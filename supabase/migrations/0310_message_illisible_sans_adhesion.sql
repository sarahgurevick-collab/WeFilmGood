-- Sarah, 21/11/2026 : retour à la règle de départ, pour rester cohérent.
-- Sans adhésion (profil gratuit, ou adhésion arrêtée 7 jours après un
-- prélèvement refusé), on voit qu'un message attend, mais on ne le lit
-- pas et on ne sait pas qui l'a écrit. Annule la partie 2 de 0309.
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
