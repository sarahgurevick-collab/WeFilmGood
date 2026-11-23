-- Le tout premier match d'un projet n'est pas un « nouveau match » (23/11/2026) :
-- la phrase « un projet encore plus proche du vôtre vient d'arriver » ne
-- s'affiche que lorsque le match a changé. La pastille, elle, compte tout
-- match pas encore vu.
alter table public.projets_matchs add column if not exists premier boolean not null default true;

CREATE OR REPLACE FUNCTION public.calculer_match(p_project uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner uuid;
  v_match uuid;
  v_pourcent int;
  v_mots text[];
begin
  select owner_id into v_owner from public.projects where id = p_project;
  if not found then return; end if;
  if not (coalesce(auth.role(), '') = 'service_role' or public.is_admin() or v_owner = auth.uid()) then
    raise exception 'Réservé à l''auteur de la fiche';
  end if;

  if not public.match_pret(p_project) then
    delete from public.projets_matchs where project_id = p_project;
    return;
  end if;

  select x.project_id, x.pourcent,
         array(select m from unnest(x.mots_communs) with ordinality u(m, n) group by m order by min(n))
    into v_match, v_pourcent, v_mots
  from public.projets_proches_calcul(p_project, null, 100) x
  join public.projects pr on pr.id = x.project_id
  where pr.is_public
    and pr.masque_par_admin_le is null
    and pr.owner_id is distinct from v_owner
    and exists (select 1 from public.project_keywords pk where pk.project_id = pr.id and pk.source = 'ia')
  order by x.score desc, pr.title
  limit 1;

  if v_match is null then
    delete from public.projets_matchs where project_id = p_project;
    return;
  end if;

  insert into public.projets_matchs as pm (project_id, match_id, pourcent, mots_communs)
  values (p_project, v_match, v_pourcent, coalesce(v_mots, '{}'))
  on conflict (project_id) do update set
    pourcent = excluded.pourcent,
    mots_communs = excluded.mots_communs,
    calcule_le = now(),
    change_le = case when pm.match_id is distinct from excluded.match_id then now() else pm.change_le end,
    vu_le = case when pm.match_id is distinct from excluded.match_id then null else pm.vu_le end,
    premier = pm.premier and pm.match_id is not distinct from excluded.match_id,
    match_id = excluded.match_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mon_match(p_project uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner uuid;
  v_adherent boolean;
  v_pm public.projets_matchs;
  v_res jsonb;
begin
  select owner_id into v_owner from public.projects where id = p_project;
  if not found or not (public.is_admin() or v_owner = auth.uid()) then
    return null;
  end if;
  v_adherent := public.is_admin() or public.a_une_adhesion_active(auth.uid());
  v_res := jsonb_build_object(
    'themes', public.match_themes(p_project),
    'seuil', public.match_seuil(),
    'pret', public.match_pret(p_project),
    'adherent', v_adherent);

  select * into v_pm from public.projets_matchs where project_id = p_project;
  if not found then return v_res; end if;

  v_res := v_res || jsonb_build_object(
    'mots_communs', to_jsonb(v_pm.mots_communs),
    'nouveau', v_pm.vu_le is null and not v_pm.premier,
    'change_le', v_pm.change_le);
  if v_adherent then
    v_res := v_res || jsonb_build_object('projet', (
      select jsonb_build_object('id', pr.id, 'titre', pr.title, 'tagline', pr.tagline, 'auteur_id', pr.owner_id)
      from public.projects pr where pr.id = v_pm.match_id));
  end if;
  return v_res;
end;
$function$;

notify pgrst, 'reload schema';
