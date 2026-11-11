-- Les projets fermés aux non-adhérents, dans la base elle-même (12/11/2026,
-- décision de Sarah, après deux siphonnages subis par WeFilmGood).
--
-- Jusqu'ici tout membre connecté, même gratuit, pouvait lire la table des
-- projets en entier (titres, loglines, synopsis) et, par ricochet, les
-- personnages et les images, en s'adressant directement à la base. Les
-- pages cachaient, la base donnait.
--
-- Désormais la base ne donne un projet qu'à : son auteur, l'administration,
-- le lecteur à qui il est attribué, les adhérents, et — projet par projet —
-- celui qui l'a ouvert avec un Gravity ou qui est invité dans son équipe.
-- Les personnages et les images suivent (leurs règles consultent projects).
-- Les cartes des Galaxies, pour un non-adhérent, sont lues par le serveur
-- (clientCartes, src/lib/supabase/admin.ts), qui n'envoie ni titre ni fiche.

create or replace function public.lit_les_fiches() returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and (
    public.is_admin()
    or exists (select 1 from public.memberships m
               where m.profile_id = auth.uid() and m.status = 'active'
                 and (m.expires_at is null or m.expires_at > now())));
$$;

create or replace function public.projet_ouvert_ou_equipe(p_project_id uuid) returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.gravity_ouvertures o
                 where o.profile_id = auth.uid() and o.project_id = p_project_id)
      or exists (select 1 from public.project_co_authors c
                 where c.profile_id = auth.uid() and c.project_id = p_project_id);
$$;
revoke all on function public.lit_les_fiches(), public.projet_ouvert_ou_equipe(uuid) from anon;

drop policy if exists "projets lisibles : membres, lecteur attribué, admin" on public.projects;
drop policy if exists "projets lisibles : auteur, adhérents, projet ouvert, lecteur, admin" on public.projects;
create policy "projets lisibles : auteur, adhérents, projet ouvert, lecteur, admin" on public.projects
  for select using (
    is_admin()
    or auth.uid() = owner_id
    or (is_public and auth.uid() is not null
        and ((select public.lit_les_fiches()) or public.projet_ouvert_ou_equipe(id)))
    or exists (select 1 from public.reading_assignments a
               where a.project_id = projects.id and a.reader_id = auth.uid()
                 and a.status = any (array['proposee'::reading_assignment_status, 'en_cours'::reading_assignment_status, 'rendue'::reading_assignment_status]))
  );

-- La recherche et le nuage ne renvoient que des numéros de projets et des
-- mots : ils lisent désormais avec les droits du serveur (sinon un
-- non-adhérent ne trouverait plus rien), et ne répondent plus sans compte.
alter function public.rechercher_projets(text, integer, text, text, text, text, text, text, text, text) security definer set search_path = public, extensions;
alter function public.nuage_mots_cles(integer) security definer set search_path = public, extensions;
alter function public.mots_cles_proches(text, integer) security definer set search_path = public, extensions;
revoke all on function public.rechercher_projets(text, integer, text, text, text, text, text, text, text, text), public.nuage_mots_cles(integer), public.mots_cles_proches(text, integer) from public, anon;
grant execute on function public.rechercher_projets(text, integer, text, text, text, text, text, text, text, text), public.nuage_mots_cles(integer), public.mots_cles_proches(text, integer) to authenticated, service_role;
