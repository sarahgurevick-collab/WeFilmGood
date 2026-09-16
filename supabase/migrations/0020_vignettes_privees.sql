-- =====================================================================
-- Les vignettes sortent de l'accès public.
--
-- Elles proviennent parfois de photogrammes ou d'images trouvées en
-- ligne. L'auteur qui illustre son projet et l'envoie à un producteur
-- fait un usage créatif et privé, comparable à son scénario PDF avec une
-- image en première page. La plateforme, elle, exploite un catalogue :
-- en donner un accès public serait un tout autre usage.
--
-- Fermer la page ne suffisait pas — l'adresse directe des images restait
-- ouverte à qui la détenait. L'accès est donc rendu à deux situations :
-- être connecté, ou détenir le lien de partage d'un projet.
-- =====================================================================

update storage.buckets set public = false where id = 'project-media';

drop policy if exists "vignettes de projet lisibles par tous" on storage.objects;

create policy "vignettes réservées aux membres et aux projets partagés"
  on storage.objects for select
  using (
    bucket_id = 'project-media'
    and (
      auth.uid() is not null
      or exists (
        select 1
        from public.project_files pf
        join public.projects p on p.id = pf.project_id
        where pf.storage_path = storage.objects.name
          and p.share_token is not null
      )
    )
  );
