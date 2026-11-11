-- Règle de Sarah (11/11) : une fois le projet envoyé à la lecture, l'auteur
-- garde quelques minutes pour vérifier qu'il ne s'est pas trompé, puis le
-- PDF « disparaît » pour lui aussi : il ne peut plus ni l'ouvrir, ni le
-- remplacer, ni le retirer (le lecteur commence souvent très vite).
-- « Envoyé » = lecture payée depuis plus de 15 minutes, ou projet déjà
-- attribué / lu (WFG 2 ou WFG 1), ou statut au-delà de « déposé ».
-- Une fiche créée sans demande de lecture reste entre les mains de l'auteur.
create or replace function public.scenario_ferme(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
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
    or exists (select 1 from public.legacy_reading_reports l where l.project_id = p_project_id)
    or exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.status::text not in ('brouillon', 'depose')
    );
$$;

grant execute on function public.scenario_ferme(uuid) to authenticated;

-- Le fichier lui-même : l'auteur garde son dossier, sauf les fichiers d'un
-- projet fermé.
drop policy if exists "scénarios privés par utilisateur" on storage.objects;
create policy "scénarios privés par utilisateur"
  on storage.objects for all
  using (
    bucket_id = 'scenarios'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.project_files pf
      where pf.storage_path = objects.name and public.scenario_ferme(pf.project_id)
    )
  )
  with check (
    bucket_id = 'scenarios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- La ligne qui rattache le fichier au projet : l'auteur ne peut plus en
-- ajouter, en changer ni en retirer une fois le projet fermé. (Il la voit
-- toujours, par l'autre règle de lecture : la fiche sait qu'un scénario existe.)
drop policy if exists "l'auteur gère les fichiers de ses projets" on public.project_files;
create policy "l'auteur gère les fichiers de ses projets"
  on public.project_files for all
  using (
    exists (select 1 from public.projects p where p.id = project_files.project_id and p.owner_id = auth.uid())
    and (kind not in ('scenario', 'document') or not public.scenario_ferme(project_id))
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_files.project_id and p.owner_id = auth.uid())
    and (kind not in ('scenario', 'document') or not public.scenario_ferme(project_id))
  );
