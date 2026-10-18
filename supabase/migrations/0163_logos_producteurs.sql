-- Le logo de la société à la place de la photo d'un producteur qui n'en a
-- pas mis (18/10/2026, Sarah : « c'est une façon de distinguer les
-- productions, les producteurs changent dans une société »). Le logo est
-- tiré du site de la société, deviné par l'adresse email (@murchafilm.com).
-- Rien ne s'affiche avant que Sarah valide : statut « a_valider » →
-- « valide » (le logo devient l'avatar si le producteur n'a toujours pas de
-- photo) ou « ecarte ». « introuvable » : aucun logo trouvé sur le site.
create table if not exists public.logos_producteurs (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  domaine text not null,
  page_source text,
  image_source text,
  url_logo text,
  statut text not null default 'a_valider' check (statut in ('a_valider', 'valide', 'ecarte', 'introuvable')),
  note text,
  lot text,
  cree_le timestamptz not null default now(),
  traite_le timestamptz
);
alter table public.logos_producteurs enable row level security;
revoke all on public.logos_producteurs from anon, authenticated;

-- Les producteurs sans photo dont l'adresse est celle d'une société (ni
-- messagerie grand public, ni organisme), pas encore essayés.
create or replace function public.producteurs_a_logo(p_limite integer default 30)
returns table(profile_id uuid, domaine text, nom text, societe text)
language sql stable security definer set search_path = public, auth as $$
  select p.id, split_part(lower(u.email), '@', 2), p.full_name, nullif(btrim(a.society_name), '')
  from public.profiles p
  join auth.users u on u.id = p.id
  left join wfg1.accounts a on a.user_id::text = p.legacy_id::text
  where p.category = 'producteur'
    and p.avatar_url is null
    and split_part(lower(u.email), '@', 2) !~ '^(gmail|googlemail|hotmail|yahoo|outlook|live|msn|icloud|me|mac|orange|free|wanadoo|sfr|laposte|aol|gmx|protonmail|proton|yandex|mail|neuf|bbox|numericable|club-internet|libertysurf|tiscali|voila|aliceadsl|noos|cegetel|9online|ymail|rocketmail|web|t-online|skynet|telenet|bluewin|sympatico|videotron|comcast|verizon|att|sbcglobal|hotmail\.co|yahoo\.co|qq|163|naver|seznam|wp|o2|libero|virgilio|tin|alice|terra|uol|bol|ig|rediffmail|zoho|fastmail|tutanota|posteo|me\.com)\.'
    and split_part(lower(u.email), '@', 2) !~ '(\.gouv\.fr$|\.gov|\.edu$|^univ|\.ac\.|^ac-|^sacd\.fr$|^scam\.fr$|^cnc\.fr$|^ciclic\.fr$|^adami\.fr$|^femis\.fr$|^lafemis\.fr$|^procirep\.fr$|^unifrance\.org$|^mairie|^ville-|^region|^departement)'
    and not exists (select 1 from public.logos_producteurs l where l.profile_id = p.id)
  order by random()
  limit p_limite;
$$;
revoke all on function public.producteurs_a_logo(integer) from public, anon, authenticated;
grant execute on function public.producteurs_a_logo(integer) to service_role;

-- Le nom de la société connu par WFG 1, pour l'écran /admin/logos.
create or replace function public.societes_wfg1(p_ids text[])
returns table(legacy_id text, societe text)
language sql stable security definer set search_path = public as $$
  select a.user_id::text, btrim(a.society_name)
  from wfg1.accounts a
  where a.user_id::text = any(p_ids) and coalesce(btrim(a.society_name), '') <> '';
$$;
revoke all on function public.societes_wfg1(text[]) from public, anon, authenticated;
grant execute on function public.societes_wfg1(text[]) to service_role;
