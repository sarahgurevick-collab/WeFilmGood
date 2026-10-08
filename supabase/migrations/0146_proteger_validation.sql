-- Faille corrigée le 08/10/2026 : tout membre connecté pouvait modifier lui-même
-- son statut de validation (validation_status) par l'API. Seules les fonctions
-- de la base (choisir_categorie, admin_set_profile_validation) et
-- l'administration le peuvent désormais.
-- (Le bouton « Demander ma validation », essayé le même jour, a été retiré :
-- les talents de WFG 1 sont déjà tous validés par Sarah ; sa liste « À valider »
-- montre les inscriptions du jour.)
create or replace function public.proteger_validation()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.validation_status is distinct from old.validation_status
          or new.validated_at is distinct from old.validated_at
          or new.validated_by is distinct from old.validated_by) then
    raise exception 'La validation est réservée à l''administration';
  end if;
  return new;
end;
$$;
drop trigger if exists proteger_validation on public.profiles;
create trigger proteger_validation before update on public.profiles
  for each row execute function public.proteger_validation();
