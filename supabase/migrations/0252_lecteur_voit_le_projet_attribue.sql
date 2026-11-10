-- 10/11/2026 — Sarah attribue son projet « test » à Nicolas ; sur Mes lectures,
-- il lit « Projet supprimé » au lieu du titre. La fiche n'a jamais été validée
-- (is_public faux), et la règle de lecture de public.projects n'ouvre la fiche
-- qu'aux membres (fiches publiques), à l'auteur et à l'admin : le lecteur
-- attribué n'y est pas. Les fichiers (0011) font déjà exception pour lui, avec
-- les mêmes statuts d'attribution (proposée, en cours, rendue) ; la fiche suit.

drop policy if exists "projets lisibles par les membres, tous par l'admin" on public.projects;
drop policy if exists "projets lisibles par les membres, le lecteur attribué, tous pa" on public.projects;
create policy "projets lisibles : membres, lecteur attribué, admin"
  on public.projects for select
  using (
    is_admin()
    or (auth.uid() is not null and is_public)
    or auth.uid() = owner_id
    or exists (
      select 1 from public.reading_assignments a
      where a.project_id = projects.id
        and a.reader_id = auth.uid()
        and a.status in ('proposee', 'en_cours', 'rendue')
    )
  );
