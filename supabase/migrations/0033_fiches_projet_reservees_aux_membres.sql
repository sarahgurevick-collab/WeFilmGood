-- =====================================================================
-- Aucune fiche projet ne doit être lisible sans compte.
--
-- Les auteurs protègent leur travail : même une logline ne s'adresse
-- qu'à des professionnels vérifiés. S'ajoutent des droits à l'image sur
-- certaines photos, qui interdisent une diffusion ouverte.
--
-- Or `is_public` était lu comme « visible de tous », alors qu'il signifie
-- « visible des membres » : un visiteur sans compte pouvait ouvrir
-- n'importe laquelle des 5 402 fiches, avec logline, synopsis,
-- personnages et mots-clés.
--
-- Le lien de partage reste ouvert : il passe par `get_shared_project`,
-- fonction à droits élevés que ces règles ne concernent pas. C'est le
-- seul chemin par lequel un projet sort de la plateforme, et c'est son
-- auteur qui le décide.
--
-- Pour l'accueil, une fonction ne renvoyant que des NOMBRES permet
-- d'annoncer ce que contient la plateforme sans en montrer la matière.
-- =====================================================================

drop policy if exists "projets publics lisibles" on public.projects;
create policy "projets lisibles par les membres"
  on public.projects for select
  using (
    (auth.uid() is not null and is_public)
    or auth.uid() = owner_id
  );

drop policy if exists "personnages visibles si projet public ou par l'auteur" on public.characters;
create policy "personnages visibles par les membres"
  on public.characters for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = characters.project_id
        and ((auth.uid() is not null and p.is_public) or p.owner_id = auth.uid())
    )
  );

drop policy if exists "mots-clés de projet lisibles" on public.project_keywords;
create policy "mots-clés de projet lisibles par les membres"
  on public.project_keywords for select
  using (auth.uid() is not null);

-- ---------------------------------------------------------------------
-- Le décompte public : des nombres, rien d'autre.
-- ---------------------------------------------------------------------
create or replace function public.compter_recherche(q text)
returns table (projets bigint, talents bigint, personnages bigint)
language sql
stable
security definer
set search_path = public
as $$
  with terme as (
    select nullif(btrim(q), '') as mot,
           '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  mots as (
    select k.id from public.keywords k, terme t
    where t.mot is not null
      and (k.label_fr ilike t.motif or similarity(k.label_fr, t.mot) >= 0.45)
  )
  select
    (select count(distinct p.id) from public.projects p, terme t
       where t.mot is not null and p.is_public
         and (p.title ilike t.motif or p.logline ilike t.motif or p.synopsis ilike t.motif
              or exists (select 1 from public.project_keywords pk
                         where pk.project_id = p.id and pk.keyword_id in (select id from mots)))),
    (select count(*) from public.profiles pr, terme t
       where t.mot is not null
         and (pr.bio ilike t.motif or pr.full_name ilike t.motif or pr.display_name ilike t.motif)),
    (select count(*) from public.characters c
       join public.projects p on p.id = c.project_id, terme t
       where t.mot is not null and p.is_public
         and (c.name ilike t.motif or c.biography ilike t.motif));
$$;

grant execute on function public.compter_recherche(text) to anon, authenticated;
