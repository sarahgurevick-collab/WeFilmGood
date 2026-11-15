-- Correction de 0276 (15/11) : la règle « aucune fiche écrite » laissait hors
-- de la file les projets déjà lus autrefois sur WFG 1 puis renvoyés pour une
-- NOUVELLE lecture (fiches anciennes validées + une fiche ouverte, pas encore
-- écrite). Ils attendent une analyse comme les autres (Sarah, 14/11 :
-- « Oui, vas-y » pour les projets de WFG 1 à analyser).
-- Entrent donc aussi : les projets « en lecture » sur WFG 1 qui ont une fiche
-- ouverte (statut 0) et aucune fiche en attente de validation (statut 1).
-- Ceux qui sont « labellisés » sur WFG 2 ne sont pas touchés : les remettre
-- en lecture retirerait leur label, à Sarah d'en décider.
-- Les lectures déjà confiées se posent en rejouant 0277.
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
    and exists (select 1 from wfg1_final.projects_review r where r.project = w.project_id and r.status = 0)
    and not exists (select 1 from wfg1_final.projects_review r where r.project = w.project_id and r.status = 1)
    and not exists (select 1 from public.lecture_demandes d where d.project_id = p.id);
end $$;
