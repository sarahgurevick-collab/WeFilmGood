-- Femme ou homme, pour les statistiques (28/11/2026, Sarah, à la suite du
-- partenariat envisagé avec Réalisatrices Équitables). Mémo pour
-- l'administration UNIQUEMENT : personne d'autre ne le voit, et aucune
-- question n'est posée aux membres. (« genre » veut déjà dire le genre d'un
-- film sur WFG, d'où le nom femme_homme.)
-- Rempli d'après la case de WFG 1 et le prénom ; les cas douteux restent
-- vides (« à vérifier ») et Sarah les tranche à la main.

create table if not exists public.profils_femme_homme (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  -- null = à vérifier (prénom douteux ou contradiction avec WFG 1)
  valeur text check (valeur in ('femme', 'homme')),
  -- d'où vient la valeur : « wfg1+prenom », « prenom », « wfg1 »,
  -- « prenom (corrige wfg1) », « prenom (avis Claude) », « a verifier », « Sarah »
  source text not null,
  pose_le timestamptz not null default now()
);

alter table public.profils_femme_homme enable row level security;
revoke all on public.profils_femme_homme from anon, authenticated;
create policy "profils_femme_homme : administration" on public.profils_femme_homme
  for all using (public.is_admin()) with check (public.is_admin());
