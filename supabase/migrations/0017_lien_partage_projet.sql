-- =====================================================================
-- Lien de partage d'une fiche projet.
--
-- Un auteur doit pouvoir envoyer son projet à un producteur qui n'a pas
-- de compte — c'est impossible aujourd'hui, et c'est justement là que se
-- montre la labellisation, qui fait la valeur du travail de sélection.
--
-- On passe par un jeton secret plutôt que par la visibilité publique :
-- un auteur qui démarche quelques producteurs ne souhaite pas forcément
-- exposer son projet à tous pendant ce temps. Le jeton se régénère, ce
-- qui referme l'accès aux destinataires précédents.
-- =====================================================================

alter table public.projects add column if not exists share_token uuid unique;

-- Lecture du projet par le seul détenteur du lien. Fonction « security
-- definer » : la table reste fermée, et rien de confidentiel ne sort ici
-- — ni synopsis, ni scénario, ni coordonnées.
create or replace function public.get_shared_project(p_token uuid)
returns table (
  id          uuid,
  title       text,
  logline     text,
  format      public.project_format,
  country     text,
  genre_label text,
  labellise   boolean,
  author_name text,
  vignette_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.title,
    p.logline,
    p.format,
    p.country,
    g.label_fr,
    p.status = 'labellise',
    auteur.full_name,
    (
      select pf.storage_path
      from public.project_files pf
      where pf.project_id = p.id and pf.kind = 'vignette'
      order by pf.uploaded_at desc
      limit 1
    )
  from public.projects p
  left join public.genres g on g.slug = p.genre_slug
  join public.profiles auteur on auteur.id = p.owner_id
  where p.share_token = p_token;
$$;

grant execute on function public.get_shared_project(uuid) to anon, authenticated;


-- Création ou révocation du lien, réservées au titulaire du projet.
create or replace function public.set_project_share_token(p_project_id uuid, p_actif boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  nouveau uuid;
begin
  if not exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = auth.uid()
  ) then
    raise exception 'Seul le titulaire du projet peut partager ce lien';
  end if;

  nouveau := case when p_actif then gen_random_uuid() else null end;

  update public.projects set share_token = nouveau where id = p_project_id;

  return nouveau;
end;
$$;

grant execute on function public.set_project_share_token(uuid, boolean) to authenticated;
