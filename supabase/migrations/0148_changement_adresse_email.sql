-- Changement d'adresse email (09/10/2026, Sarah) : un membre dont l'adresse
-- est spammée doit pouvoir en prendre une autre. Le membre demande, reçoit un
-- lien sur la nouvelle adresse, et le compte bascule au clic. L'ancienne
-- adresse n'est pas prévenue (décision de Sarah). L'administration peut
-- changer l'adresse d'un membre directement.

create table if not exists public.email_changes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  nouvelle_adresse text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
comment on table public.email_changes is
  'Demandes de changement d''adresse email : jeton (haché) envoyé à la nouvelle adresse, valable 24 h, à usage unique. Lue et écrite par le serveur seul (clé de service).';

-- Aucune règle : seule la clé de service y touche.
alter table public.email_changes enable row level security;
revoke all on public.email_changes from anon, authenticated;

-- Une adresse est-elle déjà celle d'un compte ? Lecture de auth.users sans
-- l'exposer : la fonction ne répond que oui/non.
create or replace function public.adresse_deja_utilisee(p_email text)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users u where lower(u.email) = lower(trim(p_email)));
$$;
revoke all on function public.adresse_deja_utilisee(text) from public, anon;
grant execute on function public.adresse_deja_utilisee(text) to authenticated, service_role;
