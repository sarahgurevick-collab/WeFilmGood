-- Nouveau métier « Distributeur » (19/11/2026, Sarah). Il se choisit comme
-- les métiers du plateau (producteur, autre talent) ; « distribution » et
-- « distributrice » servent à la recherche.
insert into public.roles (slug, label_fr, label_en, position, is_public, synonymes)
values ('distributeur', 'Distributeur', 'Distributor', 15, true, array['distributrice', 'distribution'])
on conflict (slug) do nothing;
