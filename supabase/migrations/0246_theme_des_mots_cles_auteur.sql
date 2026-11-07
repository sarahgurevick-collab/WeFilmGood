-- Chaque mot-clé de l'auteur appartient à un des trois thèmes (07/11/2026,
-- Sarah : « j'ai besoin d'avoir des mots clés dans ces 3 catégories ») :
-- Sous-genres & styles, Sujets & personnages, Univers & Lieux. Un mot des
-- nuages a son thème ; un mot tapé prend le thème du bouton au moment où il
-- est choisi. Le thème est rangé avec le mot.

alter table public.project_keywords
  add column if not exists theme_auteur text
  check (theme_auteur in ('styles', 'sujets', 'univers'));

drop function if exists public.poser_mots_cles_auteur(uuid, text[]);

create or replace function public.poser_mots_cles_auteur(p_project uuid, p_mots text[], p_themes text[] default null)
returns text[]
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_ids bigint[];
  v_themes text[];
begin
  if not (public.is_admin() or exists (select 1 from public.projects where id = p_project and owner_id = auth.uid())) then
    raise exception 'Réservé à l''auteur de la fiche';
  end if;

  select coalesce(array_agg(id order by rang), '{}'), coalesce(array_agg(theme order by rang), '{}')
    into v_ids, v_themes
  from (
    select distinct on (k.id) k.id, o.n as rang,
           case when p_themes[o.n] in ('styles', 'sujets', 'univers') then p_themes[o.n] end as theme
    from unnest(coalesce(p_mots, '{}')) with ordinality o(m, n)
    join public.keywords k
      on k.slug = btrim(regexp_replace(lower(public.sans_accent(btrim(o.m))), '[^a-z0-9]+', '_', 'g'), '_')
    where public.mot_cle_proposable(k.id)
       or exists (select 1 from public.project_keywords pk
                   where pk.project_id = p_project and pk.keyword_id = k.id and pk.source = 'demande_auteur')
    order by k.id, o.n
  ) x;
  v_ids := v_ids[1:40];
  v_themes := v_themes[1:40];

  delete from public.project_keywords
   where project_id = p_project and source = 'demande_auteur' and not (keyword_id = any (v_ids));

  insert into public.project_keywords (project_id, keyword_id, source, theme_auteur)
  select p_project, u.id, 'demande_auteur', u.theme
  from unnest(v_ids, v_themes) u(id, theme)
  on conflict (project_id, keyword_id) do update set source = 'demande_auteur', theme_auteur = excluded.theme_auteur;

  return array(select k.label_fr from unnest(v_ids) with ordinality u(id, n) join public.keywords k on k.id = u.id order by u.n);
end;
$fn$;
revoke all on function public.poser_mots_cles_auteur(uuid, text[], text[]) from public, anon;
grant execute on function public.poser_mots_cles_auteur(uuid, text[], text[]) to authenticated, service_role;

notify pgrst, 'reload schema';
