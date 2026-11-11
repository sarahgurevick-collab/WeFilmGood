-- Le Gravity du jour et les favoris (12/11/2026, Sarah : « démarre par les
-- points 1 à 3 »). Règles du 11/11 :
--   · sans adhésion, on lit les fiches (équipe floutée, sans noms) ;
--   · l'adhérent a 1 Gravity par jour : il ouvre UN projet de son choix, et
--     pour ce projet « tout s'ouvre » (videopitch, noms et photos de
--     l'équipe, contact). Le Gravity non utilisé est perdu ;
--   · l'ouverture vaut pour ce projet, pas pour les autres projets de
--     l'auteur ; un projet ouvert le reste.
-- Jusqu'ici la fiche ouvrait tout à tout adhérent (état provisoire).
-- La colonne « source » prépare le Pack Gravity (pas encore en service).

create table if not exists public.gravity_ouvertures (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  ouvert_le  timestamptz not null default now(),
  -- Le jour à Paris : c'est lui qui dit si le Gravity du jour est dépensé.
  jour       date not null,
  source     text not null default 'jour' check (source in ('jour', 'pack', 'admin')),
  primary key (profile_id, project_id)
);
create index if not exists gravity_ouvertures_jour on public.gravity_ouvertures (profile_id, jour) where source = 'jour';
alter table public.gravity_ouvertures enable row level security;
drop policy if exists "chacun voit ses projets ouverts, l'administration tous" on public.gravity_ouvertures;
create policy "chacun voit ses projets ouverts, l'administration tous" on public.gravity_ouvertures
  for select using (profile_id = auth.uid() or is_admin());
-- Aucune écriture directe : seule la fonction ouvrir_projet() dépense un Gravity.
revoke insert, update, delete on public.gravity_ouvertures from anon, authenticated;

-- Les projets mis de côté (le cœur) : « Enregistre le projet dans tes favoris ».
create table if not exists public.favoris (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  ajoute_le  timestamptz not null default now(),
  primary key (profile_id, project_id)
);
alter table public.favoris enable row level security;
drop policy if exists "chacun gère ses favoris" on public.favoris;
create policy "chacun gère ses favoris" on public.favoris
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "l'administration voit les favoris" on public.favoris;
create policy "l'administration voit les favoris" on public.favoris for select using (is_admin());

create or replace function public.jour_paris() returns date
 language sql stable as $$ select (now() at time zone 'Europe/Paris')::date $$;

-- Ce membre a-t-il ouvert ce projet avec un Gravity ?
create or replace function public.projet_ouvert(p_project_id uuid) returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.gravity_ouvertures o
                 where o.profile_id = auth.uid() and o.project_id = p_project_id);
$$;

-- Le Gravity du jour est-il encore à dépenser ? (adhérent, rien ouvert aujourd'hui)
create or replace function public.gravity_du_jour_disponible() returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null
     and public.a_une_adhesion_active(auth.uid())
     and not exists (select 1 from public.gravity_ouvertures o
                     where o.profile_id = auth.uid() and o.source = 'jour' and o.jour = public.jour_paris());
$$;

-- Dépenser son Gravity du jour sur un projet. Renvoie : 'ouvert', 'deja'
-- (déjà ouvert, rien dépensé), 'inutile' (l'auteur, son équipe,
-- l'administration voient déjà tout), 'sans_adhesion', 'utilise' (Gravity
-- du jour déjà dépensé) ou 'introuvable'.
create or replace function public.ouvrir_projet(p_project_id uuid) returns text
 language plpgsql security definer set search_path to 'public' as $$
declare
  v_moi uuid := auth.uid();
  v_owner uuid;
begin
  if v_moi is null then return 'introuvable'; end if;
  select owner_id into v_owner from public.projects where id = p_project_id and is_public;
  if v_owner is null then return 'introuvable'; end if;
  if v_owner = v_moi or public.is_admin()
     or exists (select 1 from public.project_co_authors c
                where c.project_id = p_project_id and c.profile_id = v_moi and c.status = 'accepte') then
    return 'inutile';
  end if;
  if exists (select 1 from public.gravity_ouvertures where profile_id = v_moi and project_id = p_project_id) then
    return 'deja';
  end if;
  if not public.a_une_adhesion_active(v_moi) then return 'sans_adhesion'; end if;
  -- Un seul Gravity du jour, même si deux clics partent en même temps.
  perform pg_advisory_xact_lock(hashtext('gravity:' || v_moi::text));
  if exists (select 1 from public.gravity_ouvertures
             where profile_id = v_moi and source = 'jour' and jour = public.jour_paris()) then
    return 'utilise';
  end if;
  insert into public.gravity_ouvertures (profile_id, project_id, jour, source)
  values (v_moi, p_project_id, public.jour_paris(), 'jour');
  return 'ouvert';
end;
$$;
revoke all on function public.ouvrir_projet(uuid), public.projet_ouvert(uuid), public.gravity_du_jour_disponible() from anon;
grant execute on function public.ouvrir_projet(uuid), public.projet_ouvert(uuid), public.gravity_du_jour_disponible() to authenticated;

-- Le videopitch : plus « tout adhérent », mais « qui a ouvert ce projet ».
create or replace function public.peut_voir_videopitch(p_project_id uuid) returns boolean
 language sql stable security definer set search_path to 'public' as $function$
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
            and exists (select 1 from public.gravity_ouvertures o
                        where o.profile_id = auth.uid() and o.project_id = p.id)
            and public.projet_visible_pour_moi(p.owner_id, p.visible_pour))
        -- CinéCrush de la semaine (24/10) : gratuit pour tous les membres.
        or p.id = public.cinecrush_en_cours()
      )
  );
$function$;

-- L'équipe : les noms pour l'auteur, son équipe, l'administration et qui a
-- ouvert ce projet (plus « tout adhérent »).
create or replace function public.equipe_projet(p_project_id uuid)
 returns table(profile_id uuid, nom text, role text, avatar_url text, est_auteur boolean)
 language sql stable security definer set search_path to 'public' as $function$
  with droit as (
    select auth.uid() is not null and (
      is_admin()
      or exists (select 1 from public.gravity_ouvertures o where o.profile_id = auth.uid() and o.project_id = p_project_id)
      or exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid())
      or exists (select 1 from public.project_co_authors c
                 where c.project_id = p_project_id and c.profile_id = auth.uid() and c.status = 'accepte')
    ) as voit_les_noms
  )
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

-- L'envoi d'un message à propos d'un projet demande de l'avoir ouvert.
CREATE OR REPLACE FUNCTION public.envoyer_message(p_destinataire uuid, p_projet uuid, p_corps text, p_objet text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_moi uuid := auth.uid();
  v_id uuid;
  v_objet text := nullif(btrim(coalesce(p_objet, '')), '');
begin
  if v_moi is null then
    raise exception 'connexion requise';
  end if;
  if p_corps is null or btrim(p_corps) = '' then
    raise exception 'message vide';
  end if;
  if p_destinataire is null or p_destinataire = v_moi then
    raise exception 'destinataire invalide';
  end if;
  if not (public.a_une_adhesion_active(v_moi) or public.is_admin()) then
    raise exception 'adhésion requise';
  end if;

  -- Un lecteur est introuvable : on ne lui écrit pas.
  if not exists (select 1 from public.profiles where id = p_destinataire)
     or exists (select 1 from public.profile_roles where profile_id = p_destinataire and role_slug = 'lecteur') then
    raise exception 'destinataire introuvable';
  end if;

  -- Messagerie fermée (08/10) : on peut toujours répondre à qui a écrit le premier.
  if public.messagerie_fermee(p_destinataire) and not exists (
    select 1 from public.project_messages m
    where m.sender_id = p_destinataire and m.recipient_id = v_moi
  ) then
    raise exception 'indisponible';
  end if;

  -- Hors projet (10/10) : un premier message porte un objet ; une réponse n'en a pas besoin.
  if p_projet is null and v_objet is null and not exists (
    select 1 from public.project_messages m
    where m.project_id is null
      and ((m.sender_id = p_destinataire and m.recipient_id = v_moi)
        or (m.sender_id = v_moi and m.recipient_id = p_destinataire))
  ) then
    raise exception 'objet requis';
  end if;

  -- À propos d'un projet : on écrit à son auteur, ou l'auteur répond.
  if p_projet is not null and not exists (
    select 1 from public.projects pr
    where pr.id = p_projet
      and (pr.owner_id = p_destinataire
        or (pr.owner_id = v_moi and exists (
          select 1 from public.project_messages m
          where m.project_id = p_projet and m.sender_id = p_destinataire and m.recipient_id = v_moi)))
  ) then
    raise exception 'projet invalide';
  end if;

  -- Écrire au porteur d'un projet (12/11) : il faut avoir ouvert ce projet
  -- avec un Gravity. L'administration passe ; une conversation déjà
  -- commencée sur ce projet continue ; le porteur répond librement.
  if p_projet is not null and not public.is_admin()
     and not exists (select 1 from public.projects pr where pr.id = p_projet and pr.owner_id = v_moi)
     and not exists (select 1 from public.gravity_ouvertures o where o.profile_id = v_moi and o.project_id = p_projet)
     and not exists (
       select 1 from public.project_messages m
       where m.project_id = p_projet
         and ((m.sender_id = p_destinataire and m.recipient_id = v_moi)
           or (m.sender_id = v_moi and m.recipient_id = p_destinataire))
     ) then
    raise exception 'projet à ouvrir';
  end if;

  insert into public.project_messages (project_id, sender_id, recipient_id, body, objet)
  values (p_projet, v_moi, p_destinataire, btrim(p_corps), case when p_projet is null then v_objet end)
  returning id into v_id;
  return v_id;
end;
$function$;
