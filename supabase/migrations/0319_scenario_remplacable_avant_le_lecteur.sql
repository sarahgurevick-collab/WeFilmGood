-- Le scénario reste remplaçable tant qu'aucun lecteur n'a le projet
-- (23/11/2026, Sarah : « changer la règle »).
--
-- Jusqu'ici (0254, 0255, 0294), le scénario se fermait à l'auteur un quart
-- d'heure après l'envoi à la lecture, même si le projet attendait encore
-- dans la file sans lecteur. Une auteure reprise de WFG 1 (« Les mains de sa
-- mère »), qui devait déposer un nouveau dossier avant d'être lue, ne
-- trouvait donc plus le champ pour le faire.
--
-- Désormais le scénario se ferme quand un lecteur est assigné (ou qu'une
-- fiche existe), et se rouvre comme avant à la publication de l'analyse.
-- Tant que le projet attend seulement dans la file, l'auteur peut déposer
-- une nouvelle version, qui écrase l'ancienne ; il garde sa place.
--
-- Pour les fiches reprises de WFG 1 : une fiche vide sans lecteur (statut 0,
-- reader_legacy_id nul) n'est qu'une place dans la file et ne ferme plus rien.

create or replace function public.scenario_en_lecture(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    (
      -- Première lecture : un lecteur a le projet, ou une fiche existe, et
      -- aucune analyse n'a encore été publiée.
      (
        exists (
          select 1 from public.reading_assignments a
          where a.project_id = p_project_id and a.status <> 'refusee'
        )
        or exists (select 1 from public.reading_reports r where r.project_id = p_project_id)
        or exists (
          select 1 from public.projects p
          where p.id = p_project_id and p.status::text = 'en_lecture'
        )
      )
      and not exists (
        select 1 from public.reading_report_publications pub
        join public.reading_reports r on r.id = pub.reading_report_id
        where r.project_id = p_project_id
      )
    )
    or (
      -- Nouvelle analyse : une demande payée que ni une publication ni une
      -- fiche vérifiée n'a suivie, et pour laquelle un lecteur a été assigné
      -- depuis le paiement.
      exists (
        select 1 from public.lecture_demandes d
        where d.project_id = p_project_id
          and d.status = 'payee'
          and exists (
            select 1 from public.reading_assignments a
            where a.project_id = d.project_id
              and a.status <> 'refusee'
              and a.assigned_at >= coalesce(d.paid_at, d.created_at))
          and not exists (
            select 1 from public.reading_report_publications pub
            join public.reading_reports r on r.id = pub.reading_report_id
            where r.project_id = d.project_id and pub.published_at >= d.paid_at)
          and not exists (
            select 1 from public.legacy_reading_reports l
            where l.project_id = d.project_id and l.statut = 2 and l.read_at >= d.paid_at)
      )
    )
    or (
      -- WFG 1 : une fiche attribuée à un lecteur ou à valider, aucune encore
      -- vérifiée.
      exists (
        select 1 from public.legacy_reading_reports l
        where l.project_id = p_project_id
          and l.statut in (0, 1)
          and l.reader_legacy_id is not null)
      and not exists (select 1 from public.legacy_reading_reports l where l.project_id = p_project_id and l.statut = 2)
    );
$$;
