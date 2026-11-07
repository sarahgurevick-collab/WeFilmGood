-- Une quatrième technique, « Médias mixtes » (07/11/2026, Sarah : « Je pense
-- qu'il faut ajouter l'option médias mixtes »), à côté de Prise de vues
-- réelles, Animation et Contenu IA. Elle se coche comme les autres et
-- devient le mot-clé « médias mixtes » pour la recherche.
alter table public.projects drop constraint if exists projects_techniques_valides;
alter table public.projects add constraint projects_techniques_valides
  check (techniques <@ array['prises_de_vues_reelles', 'animation', 'contenu_ia', 'medias_mixtes']);

create or replace function public.forme_mots_cles() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  paire record;
  kid bigint;
begin
  for paire in
    select * from (values
      ('documentaire', 'documentaire', coalesce('documentaire' = any (new.postures), false)),
      ('animation', 'animation', coalesce('animation' = any (new.techniques), false)),
      ('contenu_ia', 'contenu IA', coalesce('contenu_ia' = any (new.techniques), false)),
      ('medias_mixtes', 'médias mixtes', coalesce('medias_mixtes' = any (new.techniques), false))
    ) v(slug, label, present)
  loop
    if paire.present then
      insert into public.keywords (slug, label_fr) values (paire.slug, paire.label) on conflict (slug) do nothing;
      select id into kid from public.keywords where slug = paire.slug;
      insert into public.project_keywords (project_id, keyword_id, source)
      values (new.id, kid, 'forme')
      on conflict (project_id, keyword_id) do update set source = 'forme'
        where public.project_keywords.source is null or public.project_keywords.source in ('ia', 'sous_genre');
    else
      delete from public.project_keywords pk using public.keywords k
       where k.slug = paire.slug and pk.keyword_id = k.id and pk.project_id = new.id and pk.source = 'forme';
    end if;
  end loop;
  return new;
end $$;
