-- Un second téléphone par membre (19/11/2026, Sarah : Sofia Djama en a deux,
-- l'un en Algérie, l'autre en France). Réservé à l'équipe, comme le premier :
-- posé et lu par l'administration depuis le profil du membre.
alter table public.profile_private_details add column if not exists phone_2 text;
