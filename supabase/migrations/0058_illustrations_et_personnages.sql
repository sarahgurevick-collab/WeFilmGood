-- =====================================================================
-- Fiche projet en trois blocs : illustrations et personnages.
--
-- 1. Les règles d'accès au stockage manquaient dans la base vivante.
--    La table storage.objects avait la sécurité par ligne activée, mais
--    plus aucune règle : tout dépôt de fichier — scénario, vignette,
--    avatar — était refusé, et le code ignorait l'erreur. Aucun objet
--    n'a jamais été stocké. Toutes les règles sont reposées ici, en une
--    fois, y compris celles des migrations 0001, 0008, 0011 et 0020.
-- 2. Le mood board et les portraits des personnages vont dans
--    « project-media », à côté de la vignette : réservés aux membres,
--    et aux projets partagés par lien.
-- 3. L'auteur peut retirer une image (un mood board se recompose) ;
--    l'administration gère fichiers et personnages d'une fiche comme
--    son auteur, puisqu'elle corrige les fiches.
-- 4. Le classement de la pitchothèque compte désormais les
--    personnages (+10 sur 110), comme sur WeFilmGood 1.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Stockage : les scénarios (privés).
-- ---------------------------------------------------------------------
drop policy if exists "scénarios privés par utilisateur" on storage.objects;
create policy "scénarios privés par utilisateur"
  on storage.objects for all
  using (
    bucket_id = 'scenarios'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'scenarios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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

drop policy if exists "l'administration gère les scénarios" on storage.objects;
create policy "l'administration gère les scénarios"
  on storage.objects for all
  using (bucket_id = 'scenarios' and public.is_admin())
  with check (bucket_id = 'scenarios' and public.is_admin());


-- ---------------------------------------------------------------------
-- 2. Stockage : les avatars (publics).
-- ---------------------------------------------------------------------
drop policy if exists "avatars lisibles par tous" on storage.objects;
create policy "avatars lisibles par tous"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "chacun gère son avatar" on storage.objects;
create policy "chacun gère son avatar"
  on storage.objects for all
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ---------------------------------------------------------------------
-- 3. Stockage : les images de projet — vignette, mood board, portraits
--    des personnages. Lisibles des membres et des projets partagés ;
--    gérées par l'auteur dans son dossier, et par l'administration.
-- ---------------------------------------------------------------------
drop policy if exists "vignettes de projet lisibles par tous" on storage.objects;
drop policy if exists "chacun gère les vignettes de ses projets" on storage.objects;
drop policy if exists "chacun met à jour les vignettes de ses projets" on storage.objects;

drop policy if exists "vignettes réservées aux membres et aux projets partagés" on storage.objects;
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

drop policy if exists "chacun gère les images de ses projets" on storage.objects;
create policy "chacun gère les images de ses projets"
  on storage.objects for all
  using (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "l'administration gère les images des projets" on storage.objects;
create policy "l'administration gère les images des projets"
  on storage.objects for all
  using (bucket_id = 'project-media' and public.is_admin())
  with check (bucket_id = 'project-media' and public.is_admin());


-- ---------------------------------------------------------------------
-- 4. L'administration corrige les fiches : fichiers et personnages
--    compris.
-- ---------------------------------------------------------------------
drop policy if exists "l'administration gère les fichiers des projets" on public.project_files;
create policy "l'administration gère les fichiers des projets"
  on public.project_files for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "l'administration gère les personnages des projets" on public.characters;
create policy "l'administration gère les personnages des projets"
  on public.characters for all
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 5. Le classement de la pitchothèque compte les personnages.
--    Poids repris de src/lib/remplissage.ts : tagline 20, logline 20,
--    vignette 20, scénario 20, genre 10, format 10, personnages 10 —
--    ramenés en pourcentage sur 110 pour que les tranches (50 %, 30 %)
--    restent celles de WeFilmGood 1.
-- ---------------------------------------------------------------------
create or replace function public.pitchotheque(p_limite int default 60, p_decalage int default 0)
returns table (id uuid, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with fichiers as (
    select
      f.project_id,
      bool_or(f.kind = 'vignette') as a_vignette,
      bool_or(f.kind = 'scenario') as a_scenario
    from public.project_files f
    group by f.project_id
  ),
  personnages as (
    select c.project_id, count(*) as nombre
    from public.characters c
    group by c.project_id
  ),
  notes as (
    select
      p.id,
      p.status = 'labellise' as labellise,
      (coalesce(btrim(p.videopitch_fr), '') <> ''
       or coalesce(btrim(p.videopitch_en), '') <> ''
       or coalesce(btrim(p.trailer_url), '') <> '') as a_videopitch,
      round(
        (case when coalesce(btrim(p.logline), '') <> '' then 20 else 0 end
         + case when coalesce(btrim(p.synopsis), '') <> '' then 20 else 0 end
         + case when coalesce(f.a_vignette, false) then 20 else 0 end
         + case when coalesce(f.a_scenario, false) then 20 else 0 end
         + case when p.genre_slug is not null then 10 else 0 end
         + case when p.format is not null then 10 else 0 end
         + case when coalesce(pe.nombre, 0) > 0 then 10 else 0 end) * 100.0 / 110
      ) as remplissage
    from public.projects p
    left join fichiers f on f.project_id = p.id
    left join personnages pe on pe.project_id = p.id
    where p.is_public
  )
  select
    n.id,
    count(*) over () as total
  from notes n
  order by
    case
      when n.labellise then 0
      when n.a_videopitch then 1
      else 2
    end,
    case
      when n.labellise then 0
      when n.remplissage >= 50 then 1
      when n.remplissage >= 30 then 2
      else 3
    end,
    md5(n.id::text || ((now() at time zone 'Europe/Paris')::date)::text)
  limit greatest(p_limite, 0)
  offset greatest(p_decalage, 0);
$$;

grant execute on function public.pitchotheque(int, int) to authenticated;

notify pgrst, 'reload schema';
