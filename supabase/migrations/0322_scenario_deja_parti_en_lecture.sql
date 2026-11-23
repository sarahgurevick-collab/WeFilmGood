-- Un scénario parti en lecture ne se montre plus jamais à son auteur
-- (23/11/2026, Sarah : « Non, jamais »).
--
-- Pendant la lecture, la page Documents le cachait déjà (scenario_en_lecture).
-- Après l'analyse, l'auteur peut déposer sa version retravaillée, mais
-- l'ancienne ne doit pas reparaître. Cette fonction dit si le dernier
-- scénario déposé est déjà passé entre les mains d'un lecteur :
--   - un lecteur a été assigné, ou une fiche créée, après son dépôt ;
--   - ou c'est un fichier repris de WFG 1 (sa date de dépôt est celle de la
--     reprise, pas la vraie) et le projet a une fiche de lecture de WFG 1.
-- Une version déposée depuis la dernière lecture, elle, reste visible et
-- remplaçable jusqu'à ce qu'un lecteur la reçoive.
-- Le fichier reste dans le stockage : rien n'est effacé ici.

create or replace function public.scenario_deja_parti_en_lecture(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  with dernier as (
    select f.uploaded_at, f.legacy_id
    from public.project_files f
    where f.project_id = p_project_id and f.kind = 'scenario'
    order by f.uploaded_at desc
    limit 1
  )
  select exists (
    select 1 from dernier d
    where exists (
        select 1 from public.reading_assignments a
        where a.project_id = p_project_id and a.status <> 'refusee'
          and coalesce(a.assigned_at, a.created_at) >= d.uploaded_at)
      or exists (
        select 1 from public.reading_reports r
        where r.project_id = p_project_id and r.created_at >= d.uploaded_at)
      or exists (
        select 1 from public.legacy_reading_reports l
        where l.project_id = p_project_id
          and (l.reader_legacy_id is not null or l.statut = 2)
          and (d.legacy_id is not null or l.read_at >= d.uploaded_at))
  );
$$;

revoke all on function public.scenario_deja_parti_en_lecture(uuid) from public, anon;
grant execute on function public.scenario_deja_parti_en_lecture(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
