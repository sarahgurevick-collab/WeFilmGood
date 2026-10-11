-- 11/10/2026 (Sarah) : les métiers déclarés sur WFG 1 (principal et
-- complémentaires, table wfg1_metiers_membres reprise le 21/09) n'étaient
-- pas dans profile_roles, que lit le formulaire « Mes autres compétences » :
-- les cases apparaissaient vides. On les copie ; metiers_du_membre lisait
-- déjà wfg1_metiers_membres en repli, rien ne change ailleurs.
insert into public.profile_roles (profile_id, role_slug)
select m.profile_id, m.slug
from public.wfg1_metiers_membres m
join public.roles r on r.slug = m.slug
on conflict do nothing;
