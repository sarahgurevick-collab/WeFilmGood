-- Les membres ne voyaient pas les fichiers des projets des autres, même
-- les images (29/09/2026). Or la Carte du ciel et la recherche ne gardent
-- que les projets qui ont une vignette : pour un membre qui n'est pas
-- administrateur, la recherche ne trouvait rien, et les fiches
-- s'affichaient sans image. Les images elles-mêmes étaient déjà lisibles
-- des membres dans le stockage ; seule leur ligne manquait.
--
-- On ouvre la vignette et le moodboard des projets visibles des membres.
-- Le scénario et les documents joints restent réservés à l'auteur, au
-- lecteur assigné et à l'administration.
create policy "images des projets visibles des membres"
  on public.project_files
  for select
  to authenticated
  using (
    kind in ('vignette', 'moodboard')
    and exists (select 1 from public.projects p
                where p.id = project_files.project_id and p.is_public)
  );

create index if not exists project_files_vignette_idx
  on public.project_files (project_id) where kind = 'vignette';
