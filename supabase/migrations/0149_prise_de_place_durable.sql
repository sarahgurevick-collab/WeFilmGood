-- Prise de place durable (10/10/2026). Le rappel rouge « Vous agissez à la
-- place d'un membre » reposait sur un cookie de 8 heures : passé ce délai, le
-- bandeau disparaissait mais la session du membre restait ouverte, et
-- l'administratrice travaillait au nom d'un membre sans le savoir (Sarah,
-- le 09/10 au soir, à la place de Guillaume Billy). Désormais le journal
-- des prises de place sait quand chacune se termine, et le bandeau s'appuie
-- dessus : il reste tant qu'on n'est pas revenu à son compte.

alter table public.admin_impersonations add column if not exists ended_at timestamptz;

-- La personne connectée est-elle un membre dont l'administration a pris la
-- place, sans être revenue à son compte ? Lisible par le membre lui-même
-- (c'est lui qui est connecté pendant la prise de place).
create or replace function public.incarnation_active()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_impersonations i
    where i.target_id = auth.uid()
      and i.ended_at is null
      and i.started_at > now() - interval '48 hours'
  );
$$;
grant execute on function public.incarnation_active() to authenticated;

-- Fin de la prise de place : appelée depuis la session du membre, au clic
-- sur « Revenir à mon compte ».
create or replace function public.terminer_prise_de_place()
returns void language sql security definer set search_path = public as $$
  update public.admin_impersonations
  set ended_at = now()
  where target_id = auth.uid() and ended_at is null;
$$;
grant execute on function public.terminer_prise_de_place() to authenticated;

-- Une nouvelle prise de place clôt les précédentes de la même
-- administratrice : on n'est jamais à deux places à la fois.
create or replace function public.journaliser_prise_de_place(p_target uuid)
returns void language sql security definer set search_path = public as $$
  update public.admin_impersonations
  set ended_at = now()
  where admin_id = auth.uid() and ended_at is null and public.is_admin();
  insert into public.admin_impersonations (admin_id, target_id)
  select auth.uid(), p_target
  where public.is_admin();
$$;

-- Les prises de place passées sont closes, sauf la toute dernière (celle
-- de Guillaume Billy, encore ouverte ce matin dans le navigateur de Sarah).
update public.admin_impersonations
set ended_at = started_at
where ended_at is null
  and id <> (select id from public.admin_impersonations order by started_at desc limit 1);
