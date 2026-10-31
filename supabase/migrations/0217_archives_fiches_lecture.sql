-- Archives des fiches de lecture (31/10/2026, Sarah).
-- Les fiches écrites par les lecteurs de la Maison des Scénaristes pour
-- ses appels à projets (d'abord Cannes 2016, boîte .selection ; d'autres
-- suivront). C'est un mémo pour l'administration UNIQUEMENT : ni les
-- auteurs, ni les producteurs, ni les lecteurs ne les voient.
-- Une fiche est rattachée à un projet de WFG 2 quand on l'a retrouvé ;
-- sinon elle garde le titre et l'auteur tels qu'écrits sur la fiche.

insert into storage.buckets (id, name, public)
values ('archives-lecture', 'archives-lecture', false)
on conflict (id) do nothing;

create policy "archives-lecture : administration"
  on storage.objects for all
  using (bucket_id = 'archives-lecture' and public.is_admin())
  with check (bucket_id = 'archives-lecture' and public.is_admin());

create table if not exists public.archives_fiches_lecture (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  -- Comment le projet a été retrouvé (titre+auteur, titre proche+auteur, à la main).
  rattachement text,
  -- Tels qu'écrits sur la fiche.
  titre text not null,
  auteurs text,
  lecteur text,
  -- L'appel à projets ou l'occasion (« Cannes 2016 »).
  appel text,
  -- Date de réception de la fiche (l'email du lecteur).
  recue_le timestamptz,
  -- Le texte de la fiche, tiré du document (sans retouche).
  texte text,
  -- Le message du lecteur qui accompagnait la fiche, s'il dit quelque chose.
  message_lecteur text,
  -- Le document d'origine, dans le bucket archives-lecture.
  fichier text,
  fichier_nom text,
  -- D'où vient la fiche : boîte, fil Gmail ; empreinte = ne jamais importer deux fois.
  source text not null,
  fil_gmail text,
  empreinte text not null unique,
  importe_le timestamptz not null default now()
);
create index if not exists archives_fiches_lecture_projet on public.archives_fiches_lecture (project_id);
comment on table public.archives_fiches_lecture is 'Fiches de lecture des appels à projets de la Maison (archives), administration seulement (31/10/2026).';

alter table public.archives_fiches_lecture enable row level security;
revoke all on public.archives_fiches_lecture from anon, authenticated;
create policy "archives_fiches_lecture : administration" on public.archives_fiches_lecture
  for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.archives_fiches_lecture to authenticated;
