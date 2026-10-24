-- =====================================================================
-- CinéCrush (24/10/2026, décisions de Sarah).
--
-- L'ancien mot-clé « Menu » de WFG 1 devient le CinéCrush : un coup de
-- pouce d'une semaine pour la visibilité d'un projet — ce n'est PAS une
-- sélection de la Maison (ni bandeau, ni badge Primé, rien sur la
-- vignette) : seule la page CinéCrush en parle.
--
--   - La semaine va du dimanche minuit au dimanche minuit (heure de Paris).
--   - Sarah programme les projets à l'avance, un par semaine. Les semaines
--     à venir sont visibles de tous (titre et image seulement : pas le nom
--     du talent, pas d'accès au videopitch avant leur semaine).
--   - Tout membre connecté (talents et Greenlighters) voit le videopitch
--     de la semaine gratuitement, et peut commenter ; l'auteur du projet
--     répond ; c'est gratuit.
--   - Les commentaires paraissent tout de suite, sauf ceux que le filtre
--     IA met de côté pour Sarah (interrupteur « filtre_ia », à couper
--     « si tout se passe bien avec la communauté »).
--   - On repart de neuf : rien n'est repris des anciens « Menu ».
-- =====================================================================

-- 1. La programmation : un projet par semaine, chaque projet une seule fois.
create table if not exists public.cinecrush (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  -- Le dimanche qui ouvre la semaine.
  semaine date not null unique check (extract(dow from semaine) = 0),
  cree_le timestamptz not null default now(),
  cree_par uuid references public.profiles(id)
);
comment on table public.cinecrush is 'Le projet CinéCrush de chaque semaine (dimanche de début), programmé par l''administration (24/10/2026).';

-- Le dimanche qui ouvre la semaine en cours, heure de Paris.
create or replace function public.dimanche_de_la_semaine()
returns date language sql stable as $$
  select ((now() at time zone 'Europe/Paris')::date
          - extract(dow from (now() at time zone 'Europe/Paris')::date)::int);
$$;

-- Le projet CinéCrush en ce moment (null s'il n'y en a pas).
create or replace function public.cinecrush_en_cours()
returns uuid language sql stable as $$
  select project_id from public.cinecrush where semaine = public.dimanche_de_la_semaine();
$$;

alter table public.cinecrush enable row level security;
create policy "cinecrush : lisible des membres" on public.cinecrush
  for select using (auth.uid() is not null);
create policy "cinecrush : l'administration programme" on public.cinecrush
  for all using (public.is_admin()) with check (public.is_admin());

-- 2. Les commentaires.
create table if not exists public.cinecrush_commentaires (
  id uuid primary key default gen_random_uuid(),
  cinecrush_id uuid not null references public.cinecrush(id) on delete cascade,
  auteur_id uuid not null references public.profiles(id) on delete cascade,
  -- Une réponse (de l'auteur du projet ou d'un membre) sous un commentaire.
  parent_id uuid references public.cinecrush_commentaires(id) on delete cascade,
  contenu text not null check (char_length(btrim(contenu)) between 1 and 2000),
  -- publie : visible ; en_attente : mis de côté par le filtre IA, Sarah
  -- tranche ; retire : retiré par l'administration (ou l'auteur du commentaire).
  statut text not null default 'publie' check (statut in ('publie', 'en_attente', 'retire')),
  motif_ia text,
  cree_le timestamptz not null default now()
);
create index if not exists cinecrush_commentaires_par_crush on public.cinecrush_commentaires (cinecrush_id, cree_le);
comment on table public.cinecrush_commentaires is 'Les avis des membres sous le videopitch CinéCrush de la semaine ; réponses par parent_id (24/10/2026).';

alter table public.cinecrush_commentaires enable row level security;
-- Un membre lit ce qui est publié, et ses propres commentaires quels qu'ils soient.
create policy "commentaires : publiés lisibles des membres" on public.cinecrush_commentaires
  for select using (auth.uid() is not null and (statut = 'publie' or auteur_id = auth.uid() or public.is_admin()));
-- On commente seulement le CinéCrush de la semaine en cours, en son nom.
create policy "commentaires : un membre écrit sur la semaine en cours" on public.cinecrush_commentaires
  for insert with check (
    auth.uid() is not null
    and auteur_id = auth.uid()
    and exists (select 1 from public.cinecrush c where c.id = cinecrush_id and c.semaine = public.dimanche_de_la_semaine())
  );
-- L'auteur du commentaire peut le retirer ; l'administration fait tout.
create policy "commentaires : l'auteur retire le sien" on public.cinecrush_commentaires
  for update using (auteur_id = auth.uid()) with check (auteur_id = auth.uid() and statut = 'retire');
create policy "commentaires : administration" on public.cinecrush_commentaires
  for all using (public.is_admin()) with check (public.is_admin());

-- 3. Le videopitch de la semaine se voit gratuitement : tout membre connecté.
create or replace function public.peut_voir_videopitch(p_project_id uuid)
returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and auth.uid() is not null
      and (
        p.owner_id = auth.uid()
        or public.is_admin()
        or exists (select 1 from public.project_co_authors c
                   where c.project_id = p.id and c.profile_id = auth.uid() and c.status = 'accepte')
        or (p.is_public
            and exists (select 1 from public.memberships m
                        where m.profile_id = auth.uid() and m.status = 'active'
                          and (m.expires_at is null or m.expires_at > now()))
            and public.projet_visible_pour_moi(p.owner_id, p.visible_pour))
        -- CinéCrush de la semaine (24/10) : gratuit pour tous les membres.
        or p.id = public.cinecrush_en_cours()
      )
  );
$$;

-- 4. Les réglages : le filtre IA, allumé au départ.
create table if not exists public.cinecrush_reglages (
  cle text primary key,
  valeur boolean not null
);
insert into public.cinecrush_reglages (cle, valeur) values ('filtre_ia', true) on conflict do nothing;
alter table public.cinecrush_reglages enable row level security;
create policy "réglages : administration" on public.cinecrush_reglages
  for all using (public.is_admin()) with check (public.is_admin());
