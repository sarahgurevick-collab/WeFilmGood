-- =====================================================================
-- Accès aux fichiers de projet pour le lecteur assigné et l'admin.
-- Jusqu'ici seul l'auteur du projet pouvait lire project_files et les
-- objets du bucket "scenarios" : le funnel de lecture (0007) a besoin
-- que le lecteur assigné et l'admin y accèdent aussi pour ouvrir le PDF.
-- =====================================================================

drop policy if exists "fichiers réservés à l'auteur" on public.project_files;
create policy "fichiers réservés à l'auteur, au lecteur assigné et à l'admin"
  on public.project_files for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.reading_assignments a
      where a.project_id = project_files.project_id
        and a.reader_id = auth.uid()
        and a.status in ('proposee', 'en_cours', 'rendue')
    )
  );

drop policy if exists "l'auteur gère les fichiers de ses projets" on public.project_files;
create policy "l'auteur gère les fichiers de ses projets"
  on public.project_files for all
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  ));

drop policy if exists "admin et lecteur assigné accèdent au scénario" on storage.objects;
create policy "admin et lecteur assigné accèdent au scénario"
  on storage.objects for select
  using (
    bucket_id = 'scenarios'
    and (
      public.is_admin()
      or exists (
        select 1 from public.project_files pf
        join public.reading_assignments a on a.project_id = pf.project_id
        where pf.storage_path = storage.objects.name
          and a.reader_id = auth.uid()
          and a.status in ('proposee', 'en_cours', 'rendue')
      )
    )
  );
