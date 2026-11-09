-- La demande de lecture payée (09/11/2026, Sarah : « Tout le monde peut
-- déposer un projet, un document PDF, et demander une lecture et une analyse
-- du projet, qu'on soit adhérent ou pas. Il y a un coût pour chaque lecture
-- de 50 euros. […] on envoie son scénario en payant 50 euros. Le payement se
-- fait via Hello asso. » ; « Il n'y a pas le bouton "envoyer" dans l'onglet
-- document. Ce bouton envoie à la page de paiement des 50 € que l'on soit
-- adhérent ou pas. »)
--
-- Jusqu'ici, créer une fiche suffisait à faire paraître le projet dans la
-- file des lecteurs et à afficher « Projet reçu » à l'auteur, sans rien
-- payer. Désormais c'est la demande payée qui compte : une ligne par
-- paiement de 50 €, tenue pour payée seulement une fois le paiement relu
-- chez HelloAsso (comme l'adhésion).

create table if not exists public.lecture_demandes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'en_attente_paiement'
    check (status in ('en_attente_paiement', 'payee', 'annulee')),
  amount_cents integer not null,
  currency text not null default 'EUR',
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists lecture_demandes_projet on public.lecture_demandes (project_id, status);

alter table public.lecture_demandes enable row level security;

-- L'auteur voit ses demandes, l'administration les voit toutes. Personne
-- n'écrit depuis le navigateur : le site le fait avec la clé de service.
drop policy if exists "demandes de lecture visibles par l'auteur et l'admin" on public.lecture_demandes;
create policy "demandes de lecture visibles par l'auteur et l'admin"
  on public.lecture_demandes for select
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );
revoke insert, update, delete, truncate on public.lecture_demandes from anon, authenticated;

-- Les projets déjà envoyés à la lecture sur WFG 2 avant ce jour (un projet
-- d'essai) gardent leur place dans la file : une demande « reprise », à 0 €.
insert into public.lecture_demandes (project_id, profile_id, status, amount_cents, payment_provider, created_at, paid_at)
select p.id, p.owner_id, 'payee', 0, 'reprise', p.created_at, p.created_at
from public.projects p
where p.legacy_id is null
  and p.status in ('depose', 'en_lecture')
  and not exists (select 1 from public.lecture_demandes d where d.project_id = p.id);

-- La file de l'administration : la date de dépôt est celle du paiement.
create or replace function public.admin_pending_projects()
 returns table(project_id uuid, author_name text, author_email text, title text, format project_format, language text, submitted_at timestamp with time zone, current_reader_id uuid, current_reader_name text, reader_refusal_count integer, reading_status text)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select
    p.id,
    author.full_name,
    au.email,
    p.title,
    p.format,
    p.language,
    coalesce(
      (select max(d.paid_at) from public.lecture_demandes d where d.project_id = p.id and d.status = 'payee'),
      p.created_at
    ),
    la.reader_id,
    reader.full_name,
    p.reader_refusal_count,
    coalesce(la.status::text, 'sans_lecteur')
  from public.projects p
  join public.profiles author on author.id = p.owner_id
  join auth.users au on au.id = p.owner_id
  left join lateral (
    select a.reader_id, a.status
    from public.reading_assignments a
    where a.project_id = p.id
    order by a.assigned_at desc
    limit 1
  ) la on true
  left join public.profiles reader on reader.id = la.reader_id
  where public.is_admin()
    and p.status in ('depose', 'en_lecture')
  order by 7 asc;
$function$;

-- « Où en est votre projet » : « Projet reçu » ne s'affiche plus pour une
-- fiche simplement créée, seulement une fois la lecture payée.
create or replace function public.etat_de_lecture(p_project_id uuid)
 returns table(etat text, depose_le timestamp with time zone, rendue_le timestamp with time zone)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with p as (
    select pr.*
    from public.projects pr
    where pr.id = p_project_id
      and (pr.owner_id = auth.uid() or public.is_admin())
  ),
  demande as (
    select max(d.paid_at) as payee_le
    from public.lecture_demandes d
    where d.project_id = p_project_id and d.status = 'payee'
  ),
  wfg2 as (
    select
      exists (
        select 1 from public.reading_report_publications pub
        join public.reading_reports r on r.id = pub.reading_report_id
        where r.project_id = p_project_id
      ) as publiee,
      exists (select 1 from public.reading_reports r where r.project_id = p_project_id) as rendue,
      exists (
        select 1 from public.reading_assignments a
        where a.project_id = p_project_id and a.status in ('en_cours', 'rendue')
      ) as en_lecture,
      (
        select max(pub.published_at) from public.reading_report_publications pub
        join public.reading_reports r on r.id = pub.reading_report_id
        where r.project_id = p_project_id
      ) as publiee_le
  ),
  wfg1 as (
    select
      bool_or(l.statut = 2) as verifiee,
      bool_or(l.statut = 1) as a_valider,
      bool_or(l.statut = 0) as attribuee,
      max(l.read_at) filter (where l.statut = 2) as lue_le,
      (
        select w.status from wfg1.projects w
        where w.project_id::text = (select legacy_id::text from p)
        limit 1
      ) as statut_projet,
      (
        select nullif(w.date, '')::timestamptz from wfg1.projects w
        where w.project_id::text = (select legacy_id::text from p)
        limit 1
      ) as depose_wfg1
    from public.legacy_reading_reports l
    where l.project_id = p_project_id
  ),
  calcul as (
    select
      case
        when wfg2.publiee then 'disponible'
        when wfg2.rendue then 'relecture'
        when wfg2.en_lecture then 'premiere_lecture'
        when demande.payee_le is not null then 'attribution'
        when p.legacy_id is null then null
        when coalesce(wfg1.verifiee, false) then 'disponible'
        when coalesce(wfg1.a_valider, false) then 'relecture'
        when coalesce(wfg1.attribuee, false) or wfg1.statut_projet::text = '1' then 'premiere_lecture'
        else null
      end as etat,
      case
        when demande.payee_le is not null then demande.payee_le
        when p.legacy_id is not null then coalesce(wfg1.depose_wfg1, p.created_at)
        else p.created_at
      end as depose_le,
      coalesce(wfg2.publiee_le, wfg1.lue_le) as rendue_le
    from p, demande, wfg2, wfg1
  )
  select etat, depose_le, rendue_le from calcul where etat is not null;
$function$;
