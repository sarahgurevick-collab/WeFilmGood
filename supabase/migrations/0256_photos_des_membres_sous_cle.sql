-- Les photos des membres sous clé (11/11/2026, demande de Sarah).
--
-- Le dossier « avatars » était public et sa règle de lecture ouverte à
-- tous : sans compte, on pouvait en dresser la liste et télécharger toutes
-- les photos nettes. Le flou de la Galaxie de Talents ne protégeait rien.
--
-- Désormais : dossier privé, plus de lecture pour tous. Les photos nettes
-- ne sortent que par la route /api/photo du site (adresse signée par le
-- serveur, src/lib/photo.ts), les floues par /api/talents/photo.
-- Chacun garde la main sur son propre dossier (règle « chacun gère son
-- avatar », inchangée) ; l'administration sur tous.

update storage.buckets set public = false where id = 'avatars';

drop policy if exists "avatars lisibles par tous" on storage.objects;

drop policy if exists "l'administration gère les photos des membres" on storage.objects;
create policy "l'administration gère les photos des membres" on storage.objects
  for all
  using (bucket_id = 'avatars' and is_admin())
  with check (bucket_id = 'avatars' and is_admin());
