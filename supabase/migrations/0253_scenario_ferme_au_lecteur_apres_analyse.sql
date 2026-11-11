-- Règle de Sarah (11/11) : le PDF du projet n'est visible que du lecteur
-- et de l'administration ; une fois l'analyse rendue, de l'administration
-- seule. Le lecteur dont la fiche est « rendue » perd donc l'accès au
-- fichier (il le gardait jusqu'ici). L'auteur garde son propre fichier.
drop policy if exists "admin et lecteur assigné accèdent au scénario" on storage.objects;
create policy "admin et lecteur assigné accèdent au scénario"
  on storage.objects for select
  using (
    bucket_id = 'scenarios'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.project_files pf
        join public.reading_assignments a on a.project_id = pf.project_id
        where pf.storage_path = objects.name
          and a.reader_id = auth.uid()
          and a.status in ('proposee', 'en_cours')
      )
    )
  );
