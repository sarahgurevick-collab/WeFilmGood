-- Réseaux et sites professionnels du profil (20/11/2026, Sarah) : on propose
-- IMDb, Unifrance, Wikipédia, LinkedIn et un site libre. Vimeo, Viadeo et
-- Instagram ne sont plus proposés, mais restent admis pour ne pas perdre les
-- liens déjà saisis.
alter table public.profile_social_links drop constraint if exists profile_social_links_network_check;
alter table public.profile_social_links add constraint profile_social_links_network_check
  check (network = any (array['imdb', 'unifrance', 'wikipedia', 'linkedin', 'site', 'vimeo', 'viadeo', 'instagram']));
