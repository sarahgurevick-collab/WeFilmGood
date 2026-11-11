-- Tables de travail de la reprise WFG 1 fermées (11/11/2026).
--
-- Ces tables servaient aux imports et aux sauvegardes ; elles étaient
-- restées lisibles par tous, même sans compte, par l'adresse de la base :
-- _import_comptes (10 230 lignes avec nom, email, société, ville, bio),
-- _import_fiches (5 796 fiches de lecture), _import_coauteurs (emails),
-- _import_chinois, et quelques listes de travail. Aucune page du site ne
-- les lit. Rien n'est supprimé : elles restent lisibles par le serveur
-- et les scripts (clé de service), plus par personne d'autre.

do $$
declare t text;
begin
  foreach t in array array[
    '_import_comptes', '_import_coauteurs', '_import_fiches', '_import_chinois',
    '_ss', '_vimeo', '_vimeo2', 'personality_answers_sauvegarde_0178'
  ] loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;
