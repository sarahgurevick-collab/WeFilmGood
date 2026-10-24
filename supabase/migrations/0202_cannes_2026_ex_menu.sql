-- Les 6 projets qui portaient la clé Finder « Menu » (supprimée, 0201) ont
-- été sélectionnés à Cannes 2026 (Sarah, 24/10/2026) : la vraie sélection
-- est posée, le bandeau Sélection MdS/WFG et le badge « Primé » reviennent
-- par les déclencheurs. ORDURES : celui de WFG 1 n° 4249 (famille 7, « Menu »).
insert into public.project_selections (project_id, libelle)
select id, 'Cannes 2026' from public.projects
 where legacy_id in ('6210', '6192', '6264', '6225', '4249', '6354')
on conflict do nothing;
