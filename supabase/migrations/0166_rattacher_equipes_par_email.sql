-- =====================================================================
-- Les talents rattachés à un projet sur WFG 1 (19/10/2026).
--
-- Les équipes de WFG 1 ont été reprises avec une adresse e-mail, sans
-- compte quand la personne ne s'était pas inscrite (464 liens sur 350
-- projets). Dès qu'un compte à cette adresse existe et que l'adresse est
-- confirmée, le lien se fait tout seul : le talent apparaît dans l'équipe
-- du projet, sans rien à accepter (ils étaient déjà « acceptés » sur
-- WFG 1). Même chose si quelqu'un change d'adresse pour une adresse
-- attendue par un projet.
-- =====================================================================

create or replace function public.rattacher_equipes_par_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;
  if not exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;
  update public.project_co_authors c
     set profile_id = new.id
   where c.profile_id is null
     and c.status = 'accepte'
     and lower(btrim(c.invited_email)) = lower(btrim(new.email))
     and not exists (
       select 1 from public.project_co_authors d
        where d.project_id = c.project_id and d.profile_id = new.id
     );
  return new;
end;
$$;

-- Le nom commence par « z » : il passe après on_auth_user_created, qui
-- crée le profil dont le lien a besoin.
drop trigger if exists z_rattacher_equipes on auth.users;
create trigger z_rattacher_equipes
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.rattacher_equipes_par_email();

-- Rattrapage : les comptes qui existent déjà.
update public.project_co_authors c
   set profile_id = u.id
  from auth.users u
 where c.profile_id is null
   and c.status = 'accepte'
   and u.email_confirmed_at is not null
   and lower(btrim(c.invited_email)) = lower(btrim(u.email))
   and exists (select 1 from public.profiles p where p.id = u.id)
   and not exists (
     select 1 from public.project_co_authors d
      where d.project_id = c.project_id and d.profile_id = u.id
   );
