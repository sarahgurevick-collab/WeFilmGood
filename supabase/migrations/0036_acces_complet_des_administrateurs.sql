-- =====================================================================
-- L'administrateur voit toutes les fiches, brouillons compris.
--
-- La modération n'est pas théorique : un profil de prostitution
-- démarchant les producteurs a déjà dû être traité. Pour surveiller, il
-- faut pouvoir regarder — y compris ce qui n'est pas encore publié,
-- puisque c'est précisément là qu'un contenu problématique se prépare.
--
-- Le verrouillage du 0033 avait restreint l'admin comme n'importe quel
-- membre : il ne voyait que les projets publiés.
--
-- Non inclus volontairement : les messages privés entre membres. Lire la
-- correspondance de tiers est une décision qui appartient à la
-- responsable de la plateforme, pas une conséquence technique.
-- =====================================================================

drop policy if exists "projets lisibles par les membres" on public.projects;
create policy "projets lisibles par les membres, tous par l'admin"
  on public.projects for select
  using (
    public.is_admin()
    or (auth.uid() is not null and is_public)
    or auth.uid() = owner_id
  );

drop policy if exists "personnages visibles par les membres" on public.characters;
create policy "personnages visibles par les membres, tous par l'admin"
  on public.characters for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = characters.project_id
        and ((auth.uid() is not null and p.is_public) or p.owner_id = auth.uid())
    )
  );

drop policy if exists "mots-clés de projet lisibles par les membres" on public.project_keywords;
create policy "mots-clés de projet lisibles par les membres et l'admin"
  on public.project_keywords for select
  using (public.is_admin() or auth.uid() is not null);
