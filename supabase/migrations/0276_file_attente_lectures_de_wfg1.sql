-- Bascule en douceur (Sarah, 14/11) : « J'aimerai que les lecteurs fassent
-- l'analyse sur WFG2 », puis « Oui, vas-y » pour faire entrer dans la file
-- d'attente les projets de WFG 1 qui attendent encore leur analyse.
--
-- La file « Projets en attente » ne montre que les projets dont la lecture
-- est payée (0251). Les projets envoyés à la lecture sur WFG 1 l'ont été
-- là-bas : ils reçoivent ici une demande « reprise », à 0 €, datée de leur
-- dépôt sur WFG 1, comme le projet d'essai de 0249.
--
-- Entrent : les projets « en lecture » sur WFG 1 (statut 1) dont aucune
-- fiche n'est écrite. N'entrent pas : ceux dont la fiche est écrite et
-- attend la validation de Sarah (/admin/fiches) et ceux dont la fiche est
-- déjà validée. Aucun lecteur n'est posé : c'est Sarah qui attribue.
-- Rejouable : un projet qui a déjà une demande n'en reçoit pas une seconde.
do $$
begin
  if to_regclass('wfg1_final.projects') is null then
    raise notice 'schéma wfg1_final absent : rien à faire';
    return;
  end if;

  insert into public.lecture_demandes
    (project_id, profile_id, status, amount_cents, payment_provider, payment_reference, created_at, paid_at)
  select p.id, p.owner_id, 'payee', 0, 'reprise', 'wfg1-' || w.project_id,
         w.date::timestamp at time zone 'Europe/Paris',
         w.date::timestamp at time zone 'Europe/Paris'
  from wfg1_final.projects w
  join public.projects p on p.legacy_id = w.project_id::text
  where w.status = 1
    and p.status in ('depose', 'en_lecture')
    and not exists (
      select 1 from wfg1_final.projects_review r
      where r.project = w.project_id and r.status in (1, 2)
    )
    and not exists (select 1 from public.lecture_demandes d where d.project_id = p.id);
end $$;
