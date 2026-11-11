-- Les profils des autres sous clé (12/11/2026, décision de Sarah).
--
-- Jusqu'ici tout membre connecté pouvait lire la table des profils en
-- entier (noms, biographies, sites, agents) en s'adressant directement à
-- la base : le masquage des noms n'existait qu'à l'écran. Désormais la
-- base ne donne à un membre que SON profil ; l'administration lit tout.
-- Les pages qui montrent le profil d'un autre le font lire par le serveur
-- (clientProfils, src/lib/supabase/admin.ts) et appliquent les règles.

drop policy if exists "profils réservés aux membres" on public.profiles;
drop policy if exists "chacun lit son profil, l'administration les lit tous" on public.profiles;
create policy "chacun lit son profil, l'administration les lit tous" on public.profiles
  for select using (auth.uid() = id or is_admin());

-- Les liens vers les réseaux sociaux disent qui est la personne : même règle.
drop policy if exists "réseaux sociaux visibles par les connectés" on public.profile_social_links;
drop policy if exists "réseaux sociaux lus par l'administration" on public.profile_social_links;
create policy "réseaux sociaux lus par l'administration" on public.profile_social_links
  for select using (is_admin());

-- L'annuaire de l'ancienne plateforme (noms et biographies de WFG 1) :
-- aucune page ne le lit, il restait ouvert à tout membre.
revoke all on public.annuaire_ancienne_plateforme from anon, authenticated;

-- L'équipe d'un projet : la fonction donnait les noms à n'importe quel
-- membre, pour n'importe quel projet. Elle ne les donne plus qu'à ceux
-- qui ont le droit de les voir sur la fiche (02/10) : l'auteur, son équipe,
-- l'administration et les adhérents. Les autres reçoivent l'équipe sans nom.
create or replace function public.equipe_projet(p_project_id uuid)
 returns table(profile_id uuid, nom text, role text, avatar_url text, est_auteur boolean)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with droit as (
    select auth.uid() is not null and (
      is_admin()
      or a_une_adhesion_active(auth.uid())
      or exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid())
      or exists (select 1 from public.project_co_authors c
                 where c.project_id = p_project_id and c.profile_id = auth.uid() and c.status = 'accepte')
    ) as voit_les_noms
  )
  -- L'auteur, avec son premier métier déclaré.
  select pr.id,
         case when (select voit_les_noms from droit) or pr.id = auth.uid()
              then coalesce(nullif(btrim(pr.display_name), ''), pr.full_name) end,
         (select r.label_fr from public.profile_roles x
          join public.roles r on r.slug = x.role_slug
          where x.profile_id = pr.id
          order by r.position limit 1),
         pr.avatar_url,
         true
  from public.projects p
  join public.profiles pr on pr.id = p.owner_id
  where p.id = p_project_id and auth.uid() is not null
  union all
  -- Les talents qui ont accepté l'invitation, une fois leur nom connu.
  select pr.id,
         case when (select voit_les_noms from droit) or pr.id = auth.uid()
              then coalesce(nullif(btrim(pr.display_name), ''), pr.full_name) end,
         r.label_fr,
         pr.avatar_url,
         false
  from public.project_co_authors c
  join public.profiles pr on pr.id = c.profile_id
  left join public.roles r on r.slug = c.role_slug
  where c.project_id = p_project_id
    and c.status = 'accepte'
    and coalesce(nullif(btrim(pr.display_name), ''), nullif(btrim(pr.full_name), '')) is not null
    and auth.uid() is not null;
$function$;
