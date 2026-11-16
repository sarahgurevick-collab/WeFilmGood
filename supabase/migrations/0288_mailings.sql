-- Mailings de masse aux membres, par catégorie, métier et langue
-- (16/11/2026, Sarah : « Décidé, on le fait »). WFG 1 les envoyait depuis
-- son propre serveur et ils finissaient en indésirables ; ici WFG 2 choisit
-- les destinataires et Brevo envoie.
--
-- Rien n'est lisible ni modifiable par les membres : ces tables ne passent
-- que par la clé de service, après vérification is_admin côté site.

create table public.mailings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cree_par uuid references public.profiles(id) on delete set null,
  expediteur_nom text not null default 'WeFilmGood',
  repondre_a text not null default 'hello@wefilmgood.com',
  objet text not null default '',
  corps text not null default '',
  bouton_libelle text,
  bouton_lien text,
  -- Rien de coché dans une famille = tout le monde pour cette famille.
  categories text[] not null default '{}',
  metiers text[] not null default '{}',
  langues text[] not null default '{}',
  statut text not null default 'brouillon'
    check (statut in ('brouillon', 'envoi', 'envoye', 'interrompu')),
  nb_destinataires integer,
  nb_envoyes integer not null default 0,
  lance_le timestamptz,
  termine_le timestamptz,
  -- Dernier signe de vie de l'envoi : sans nouvelles depuis deux minutes,
  -- il s'est arrêté (redémarrage du site) et peut être repris.
  battement timestamptz,
  erreur text
);
alter table public.mailings enable row level security;

-- Une ligne par destinataire, figée au lancement : personne ne reçoit deux
-- fois le même mailing, même si l'envoi est repris.
create table public.mailing_envois (
  mailing_id uuid not null references public.mailings(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  prenom text,
  envoye_le timestamptz,
  primary key (mailing_id, profile_id)
);
create index mailing_envois_a_faire on public.mailing_envois (mailing_id) where envoye_le is null;
alter table public.mailing_envois enable row level security;

-- Qui ne veut plus recevoir les mailings (les emails du fonctionnement du
-- site — lien de connexion, messages, factures — ne sont pas concernés).
create table public.mailing_desinscriptions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  desinscrit_le timestamptz not null default now(),
  source text not null default 'lien'
);
alter table public.mailing_desinscriptions enable row level security;

-- Les désinscrits de WFG 1 (user_status.newsletter = 0) le restent.
-- À rejouer après la réimportation finale.
insert into public.mailing_desinscriptions (profile_id, source)
select p.id, 'wfg1'
from public.profiles p
join wfg1.user_status s on s.user_id = p.legacy_user_id
where s.newsletter = 0
on conflict do nothing;

-- Les destinataires d'un mailing. Dans une famille, « ou » (auteur OU
-- producteur) ; entre familles, « et » (producteur ET qui parle anglais).
-- Écartés : adresses fictives, adresse de garage, lecteurs (à part, sans
-- accès à la plateforme), comptes partis, désinscrits.
create or replace function public.mailing_destinataires(
  p_categories text[], p_metiers text[], p_langues text[]
) returns table (profile_id uuid, email text, prenom text)
 language sql stable security definer set search_path to 'public' as $$
  select p.id, u.email::text,
         nullif(btrim(coalesce(p.first_name, split_part(p.full_name, ' ', 1), '')), '')
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email is not null
    and u.email not ilike '%@sans-adresse.invalid'
    and lower(u.email) <> 'noyes.fr@gmail.com'
    and p.departed_at is null
    and p.anonymized_at is null
    and not exists (select 1 from public.mailing_desinscriptions d where d.profile_id = p.id)
    and not exists (select 1 from public.profile_roles r where r.profile_id = p.id and r.role_slug = 'lecteur')
    and (cardinality(p_categories) = 0 or p.category::text = any (p_categories))
    and (cardinality(p_metiers) = 0 or exists (
          select 1 from public.profile_roles r where r.profile_id = p.id and r.role_slug = any (p_metiers)))
    and (cardinality(p_langues) = 0 or exists (
          select 1 from public.profile_languages l where l.profile_id = p.id and l.language_code = any (p_langues)));
$$;
revoke all on function public.mailing_destinataires(text[], text[], text[]) from public, anon, authenticated;
grant execute on function public.mailing_destinataires(text[], text[], text[]) to service_role;

-- Au lancement : la liste des destinataires est figée d'un coup.
create or replace function public.mailing_figer(p_mailing uuid) returns integer
 language plpgsql security definer set search_path to 'public' as $$
declare
  m public.mailings;
  n integer;
begin
  select * into m from public.mailings where id = p_mailing for update;
  if m.id is null or m.statut <> 'brouillon' then
    return null;
  end if;
  insert into public.mailing_envois (mailing_id, profile_id, email, prenom)
  select p_mailing, d.profile_id, d.email, d.prenom
  from public.mailing_destinataires(m.categories, m.metiers, m.langues) d
  on conflict do nothing;
  get diagnostics n = row_count;
  update public.mailings
     set statut = 'envoi', nb_destinataires = n, lance_le = now(), battement = now()
   where id = p_mailing;
  return n;
end;
$$;
revoke all on function public.mailing_figer(uuid) from public, anon, authenticated;
grant execute on function public.mailing_figer(uuid) to service_role;
