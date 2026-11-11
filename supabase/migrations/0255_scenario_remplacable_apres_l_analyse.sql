-- Suite de 0254 (Sarah, 11/11) : la version donnée à la lecture « est
-- destinée à être écrasée par la nouvelle version retravaillée ». L'auteur
-- ne peut donc rien changer PENDANT la lecture (de l'envoi + 15 minutes
-- jusqu'à la publication de l'analyse), mais il peut déposer sa nouvelle
-- version ensuite. Il ne peut toujours pas rouvrir le fichier envoyé
-- (règle de 0254 sur storage.objects, inchangée).
create or replace function public.scenario_en_lecture(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    (
      (
        exists (
          select 1 from public.lecture_demandes d
          where d.project_id = p_project_id
            and d.status = 'payee'
            and coalesce(d.paid_at, d.created_at) < now() - interval '15 minutes'
        )
        or exists (
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
      -- WFG 1 : une fiche attribuée ou à valider, aucune encore vérifiée.
      exists (select 1 from public.legacy_reading_reports l where l.project_id = p_project_id and l.statut in (0, 1))
      and not exists (select 1 from public.legacy_reading_reports l where l.project_id = p_project_id and l.statut = 2)
    );
$$;

grant execute on function public.scenario_en_lecture(uuid) to authenticated;

drop policy if exists "l'auteur gère les fichiers de ses projets" on public.project_files;
create policy "l'auteur gère les fichiers de ses projets"
  on public.project_files for all
  using (
    exists (select 1 from public.projects p where p.id = project_files.project_id and p.owner_id = auth.uid())
    and (kind not in ('scenario', 'document') or not public.scenario_en_lecture(project_id))
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_files.project_id and p.owner_id = auth.uid())
    and (kind not in ('scenario', 'document') or not public.scenario_en_lecture(project_id))
  );
