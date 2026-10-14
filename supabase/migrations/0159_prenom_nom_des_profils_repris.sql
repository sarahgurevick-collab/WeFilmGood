-- Prénom et nom des profils repris de WFG 1 (14/10/2026, Sarah : « Qui
-- êtes-vous ? » montrait les deux cases vides alors que le nom s'affiche
-- partout). L'import avait rempli full_name seul ; l'écran lit first_name et
-- last_name (migration qui les a créés). 3 593 profils : repris tels quels
-- de wfg1.accounts, où prénom + nom = full_name à l'identique. Les 4 sans
-- correspondance : coupés au premier espace (prénom, puis le reste).
update public.profiles p
set first_name = btrim(a.first_name),
    last_name  = btrim(a.last_name)
from wfg1.accounts a
where a.user_id::text = p.legacy_id
  and nullif(btrim(p.first_name), '') is null
  and nullif(btrim(p.last_name), '') is null
  and nullif(btrim(a.first_name), '') is not null
  and nullif(btrim(a.last_name), '') is not null;

update public.profiles p
set first_name = split_part(btrim(p.full_name), ' ', 1),
    last_name  = nullif(btrim(substr(btrim(p.full_name), length(split_part(btrim(p.full_name), ' ', 1)) + 1)), '')
where nullif(btrim(p.first_name), '') is null
  and nullif(btrim(p.last_name), '') is null
  and nullif(btrim(p.full_name), '') is not null;
