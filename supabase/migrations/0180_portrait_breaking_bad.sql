-- =====================================================================
-- CinéMatch : « breaking bad - vince gilligan » (14) et « breaking bad de
-- vince gilligan » (1) deviennent « breaking bad » (29) — même série, même
-- réponse (21/10/2026, Sarah). L'alias reste pour l'avenir : qui tape
-- encore le nom du créateur rejoint les autres.
--
-- Les réponses libres ne sont pas des cases : l'alias est donc une table à
-- part, lue par le même déclencheur que les cases (0178). Sauvegarde : la
-- table personality_answers_sauvegarde_0178 reçoit les lignes touchées
-- qui n'y seraient pas déjà (celles-ci y sont toutes).
-- =====================================================================

create table if not exists public.personality_libre_alias (
  question_key text not null references public.personality_questions(key) on delete cascade,
  alias        text not null,
  texte        text not null,
  primary key (question_key, alias)
);
comment on table public.personality_libre_alias is
  'CinéMatch : réponses libres (normalisées par normaliser_reponse_portrait) qui valent une autre réponse libre (texte, en minuscules, tel qu''enregistré après « autre: »).';
alter table public.personality_libre_alias enable row level security;
drop policy if exists "alias libres lisibles par tous" on public.personality_libre_alias;
create policy "alias libres lisibles par tous" on public.personality_libre_alias for select using (true);

insert into public.personality_libre_alias (question_key, alias, texte)
select 'serie', public.normaliser_reponse_portrait(a), 'breaking bad'
from unnest(array['breaking bad - vince gilligan', 'breaking bad de vince gilligan', 'breaking bad.']) a
on conflict do nothing;

-- Le déclencheur de 0178 apprend les alias de réponses libres.
create or replace function public.rattacher_reponses_portrait_trg()
returns trigger
language plpgsql
as $$
declare
  k text;
  v text;
  slug text;
  libre text;
  resultat jsonb := '{}'::jsonb;
begin
  if new.personality_answers is null or jsonb_typeof(new.personality_answers) <> 'object' then
    return new;
  end if;
  for k, v in select * from jsonb_each_text(new.personality_answers) loop
    if v like 'autre:%' then
      slug := public.rattacher_reponse_portrait(k, substr(v, 7));
      if slug is not null then
        v := slug;
      else
        select a.texte into libre from public.personality_libre_alias a
         where a.question_key = k and a.alias = public.normaliser_reponse_portrait(substr(v, 7));
        if libre is not null then v := 'autre:' || libre; end if;
      end if;
    end if;
    resultat := resultat || jsonb_build_object(k, v);
  end loop;
  new.personality_answers := resultat;
  return new;
end;
$$;

update public.profiles
   set personality_answers = personality_answers
 where personality_answers ->> 'serie' in ('autre:breaking bad - vince gilligan', 'autre:breaking bad de vince gilligan', 'autre:breaking bad.');
