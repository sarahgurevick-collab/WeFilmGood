-- Les profils sans adresse email (compte à l'adresse fictive
-- <id>@sans-adresse.invalid, src/lib/sans-adresse.ts) ont l'enveloppe de
-- contact barrée, exactement comme un talent qui ne souhaite pas être
-- contacté (07/11/2026, Sarah : « Tu la laisses de la même manière qu'un
-- talent qui ne souhaite pas être contacté. C'est plus simple »). Sans
-- adresse, aucun email ne les prévient : un message resterait sans lecteur.
-- Sarah les contactera elle-même sur Facebook après la bascule.
--
-- La même règle barre l'enveloppe sur la fiche projet et sur le profil, et
-- bloque l'envoi d'un premier message (envoyer_message, 0150). Dès qu'une
-- vraie adresse est posée (« Modifier » dans l'écran des membres),
-- l'enveloppe se rouvre d'elle-même.
create or replace function public.messagerie_fermee(uid uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select (coalesce((select not messages_ouverts from public.profiles where id = uid), false)
          and public.messagerie_surveillee(uid))
      or exists (select 1 from auth.users u
                  where u.id = uid and u.email like '%@sans-adresse.invalid');
$function$;
