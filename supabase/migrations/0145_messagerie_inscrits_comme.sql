-- Correction de 0144 (08/10/2026). Le producteur et le comédien sont validés
-- dès l'inscription : ce qui compte est la profession avec laquelle on s'est
-- inscrit, pas un statut à cliquer ensuite (13 668 profils repris de WFG 1
-- ont « non_requise »). Un auteur qui ajoute « comédien » parmi ses métiers
-- n'est pas vérifié : pas de réglage de disponibilité pour lui.
--   - producteur : catégorie « producteur » ;
--   - comédien : inscrit comme talent avec ce métier (WFG 2), ou premier
--     métier (rang 0) du profil repris de WFG 1 ;
--   - jamais un profil inscrit comme auteur.
create or replace function public.messagerie_surveillee(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and coalesce(p.category::text, '') <> 'auteur'
      and (
        p.category::text = 'producteur'
        or (p.category::text = 'talent'
            and exists (select 1 from public.profile_roles r where r.profile_id = p.id and r.role_slug in ('producteur', 'comedien')))
        or exists (select 1 from public.wfg1_metiers_membres m where m.profile_id = p.id and m.rang = 0 and m.slug in ('producteur', 'comedien'))
      )
  );
$$;
