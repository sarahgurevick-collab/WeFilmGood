-- Le journal des recherches sans résultat (30/09/2026, demande de Sarah) :
-- ce que les membres tapent et qui ne trouve rien, ni projet, ni talent,
-- ni personnage. Elle le relit de temps en temps ; on en tire des règles
-- (synonymes de métiers, doublons de mots-clés à fusionner).
create table if not exists public.recherches_sans_resultat (
  id bigint generated always as identity primary key,
  requete text not null,
  -- Qui a cherché : sert seulement à ne pas noter dix fois la même frappe
  -- (« sard », « sardi », « sardine ») ; jamais affiché.
  profile_id uuid references public.profiles(id) on delete set null,
  cherche_le timestamptz not null default now()
);
create index if not exists recherches_sans_resultat_date_idx on public.recherches_sans_resultat (cherche_le desc);

alter table public.recherches_sans_resultat enable row level security;
drop policy if exists "journal des recherches lisible par l'administration" on public.recherches_sans_resultat;
create policy "journal des recherches lisible par l'administration"
  on public.recherches_sans_resultat for select to authenticated
  using (public.is_admin());

-- Notée par le serveur à la fin d'une recherche vide. Les frappes
-- intermédiaires du même membre dans la minute (« sard » avant
-- « sardine ») sont remplacées par la dernière.
create or replace function public.noter_recherche_sans_resultat(q text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := btrim(coalesce(q, ''));
begin
  if auth.uid() is null or length(v_q) < 3 or length(v_q) > 200 then return; end if;
  delete from public.recherches_sans_resultat r
  where r.profile_id = auth.uid()
    and r.cherche_le > now() - interval '1 minute'
    and (v_q like r.requete || '%' or r.requete like v_q || '%');
  insert into public.recherches_sans_resultat (requete, profile_id) values (v_q, auth.uid());
end;
$$;
revoke all on function public.noter_recherche_sans_resultat(text) from public, anon;
grant execute on function public.noter_recherche_sans_resultat(text) to authenticated, service_role;

-- Le tableau de l'administration : chaque recherche, combien de fois,
-- la dernière fois.
create or replace function public.recherches_sans_resultat_resume(p_limite integer default 300)
returns table(requete text, fois bigint, derniere timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select lower(r.requete), count(*), max(r.cherche_le)
  from public.recherches_sans_resultat r
  where public.is_admin()
  group by lower(r.requete)
  order by max(r.cherche_le) desc
  limit greatest(p_limite, 0);
$$;
revoke all on function public.recherches_sans_resultat_resume(integer) from public, anon;
grant execute on function public.recherches_sans_resultat_resume(integer) to authenticated, service_role;
