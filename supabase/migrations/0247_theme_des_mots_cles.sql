-- Chaque mot-clé a son thème (07/11/2026, Sarah : « tu ne peux pas les
-- ranger dans la catégorie qui lui revient ? ») : Sous-genres & styles,
-- Sujets & personnages ou Univers & Lieux. Les mots des nuages prennent le
-- thème de leur nuage ; les mots posés par l'IA sont classés par Claude en
-- séance (14 343 le 07/11), et les nouveaux à chaque passage de mots-clés.
-- Un mot tapé par l'auteur va dans son thème ; sans thème, dans celui du bouton.

alter table public.keywords
  add column if not exists theme text
  check (theme in ('styles', 'sujets', 'univers'));

update public.keywords k set theme = n.ligne
from public.nuages_mots_cles n
where n.slug = k.slug and k.theme is distinct from n.ligne;

-- Les suggestions donnent aussi le thème du mot.
drop function if exists public.suggerer_mots_cles(text, int);
create function public.suggerer_mots_cles(q text, p_limite int default 8)
returns table (label text, theme text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with t as (select lower(public.sans_accent(btrim(q))) as mot),
  candidats as (
    select k.id, coalesce(n.label, k.label_fr) as label, coalesce(n.ligne, k.theme) as theme,
           lower(public.sans_accent(k.label_fr)) as base, n.poids
    from public.keywords k
    left join public.nuages_mots_cles n on n.slug = k.slug, t
    where length(t.mot) >= 2
      and (lower(public.sans_accent(k.label_fr)) like '%' || replace(replace(t.mot, '%', ''), '_', '') || '%'
           or lower(public.sans_accent(k.label_fr)) % t.mot)
  )
  select c.label, c.theme
  from candidats c, t
  where auth.uid() is not null
    and (c.base like '%' || t.mot || '%' or similarity(c.base, t.mot) >= 0.45)
    and public.mot_cle_proposable(c.id)
  order by (c.base like t.mot || '%') desc,
           (c.base like '%' || t.mot || '%') desc,
           coalesce(c.poids, 0) + (select count(*) from public.project_keywords pk where pk.keyword_id = c.id) desc,
           c.label
  limit greatest(1, least(p_limite, 20));
$$;
revoke all on function public.suggerer_mots_cles(text, int) from public, anon;
grant execute on function public.suggerer_mots_cles(text, int) to authenticated, service_role;

notify pgrst, 'reload schema';
