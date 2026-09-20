-- =====================================================================
-- Les talents rattachés à un projet.
--
-- Sur WFG 1, l'auteur déclare qui fait déjà partie du projet : un rôle
-- (producteur, réalisateur…) et une adresse e-mail, qui sert
-- d'identification. Le rôle manquait ici.
--
-- L'administration doit pouvoir les consulter depuis la fiche projet :
-- la règle d'accès ne couvrait que l'auteur et l'invité.
-- =====================================================================

alter table public.project_co_authors
  add column if not exists role_slug text references public.roles(slug);

drop policy if exists "co-auteurs visibles par l'auteur du projet et l'invité"
  on public.project_co_authors;

create policy "co-auteurs visibles par l'auteur, l'invité et l'admin"
  on public.project_co_authors for select
  using (
    public.is_admin()
    or profile_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_co_authors.project_id and p.owner_id = auth.uid()
    )
  );
