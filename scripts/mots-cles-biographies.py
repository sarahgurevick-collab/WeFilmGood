#!/usr/bin/env python3
"""
Mots-clés des talents et des personnages, tirés de leur biographie
(29/09/2026). Générés par Claude en séance, par lots : pas de clé d'API
sur le site (décision de Sarah du 19/09).

  python3 scripts/mots-cles-biographies.py lot talent 100 > lot.json   (ou personnage, projet, projet-fable, projet-sonnet)
      les 100 prochains talents non traités (ou dont la biographie a changé)
  python3 scripts/mots-cles-biographies.py poser resultat.json
      écrit en base : [{"genre": "talent", "id": "…", "empreinte": "…",
      "mots": ["danse", "chant"]}, …]   (projets : + "tagline": "…")
  python3 scripts/mots-cles-biographies.py lots talent 100 5 dossier/
      prépare 5 lots de 100 (dossier/lot-1.json …), sans chevauchement
  python3 scripts/mots-cles-biographies.py poser resultat.json lot.json
      ne garde que les entrées dont id et empreinte figurent dans le lot
  python3 scripts/mots-cles-biographies.py reste
      combien il en reste à traiter

Passe par le conteneur supabase-db (docker exec psql).
"""
import json
import subprocess
import sys

TALENTS = """
  select p.id, md5(coalesce(p.biofilmo, '') || coalesce(p.bio, '')) as empreinte,
         left(btrim(concat_ws(E'\\n', p.bio, p.biofilmo)), 2500) as texte
  from public.profiles p
  where p.anonymized_at is null and p.departed_at is null
    and length(coalesce(p.biofilmo, '') || coalesce(p.bio, '')) >= 80
    and not exists (select 1 from public.profile_roles l where l.profile_id = p.id and l.role_slug = 'lecteur')
    and not exists (select 1 from wfg1.accounts a where a.user_id::text = p.legacy_id and a.role = 'reader')
    and not exists (select 1 from public.mots_cles_traites t
                    where t.genre = 'talent' and t.id = p.id
                      and t.empreinte = md5(coalesce(p.biofilmo, '') || coalesce(p.bio, '')))
"""

PERSONNAGES = """
  select c.id, md5(coalesce(c.biography, '')) as empreinte,
         concat_ws(' · ', c.name,
                   case c.gender when 'homme' then 'homme' when 'femme' then 'femme' end,
                   c.age_range::text)
           || E'\\n' || left(btrim(c.biography), 2000) as texte
  from public.characters c
  join public.projects p on p.id = c.project_id
  where p.is_public
    and length(coalesce(c.biography, '')) >= 40
    and not exists (select 1 from public.mots_cles_traites t
                    where t.genre = 'personnage' and t.id = c.id
                      and t.empreinte = md5(coalesce(c.biography, '')))
"""

# Projets (04/10/2026) : mots-clés ET tagline tirés de la logline. Les projets
# sans logline n'ont rien à lire. « courte » = logline de 140 caractères ou
# moins : elle sert telle quelle de tagline.
PROJETS = """
  select p.id, md5(coalesce(p.title, '') || coalesce(p.logline, '')) as empreinte,
         concat_ws(' · ', btrim(p.title), p.format::text, p.genre_slug)
           || E'\\n' || left(btrim(p.logline), 1500) as texte,
         length(btrim(p.logline)) <= 140 as courte
  from public.projects p
  where length(btrim(coalesce(p.logline, ''))) > 0
    and not exists (select 1 from public.mots_cles_traites t
                    where t.genre = 'projet' and t.id = p.id
                      and t.empreinte = md5(coalesce(p.title, '') || coalesce(p.logline, '')))
"""

# Les projets labellisés et ceux dont la logline fait 140 caractères ou moins
# sont confiés à Fable (décision de Sarah, 04/10/2026), les autres à Sonnet.
POUR_FABLE = " and (p.status = 'labellise' or length(btrim(p.logline)) <= 140)"
REQUETES = {
    "talent": TALENTS,
    "personnage": PERSONNAGES,
    "projet": PROJETS,
    "projet-fable": PROJETS + POUR_FABLE,
    "projet-sonnet": PROJETS + " and not (" + POUR_FABLE[5:] + ")",
    # le groupe Sonnet dont la meilleure note de fiche de lecture est sous 100
    "projet-sonnet-bas": PROJETS + " and not (" + POUR_FABLE[5:] + ")"
    + " and (select max(r.final_mark) from public.legacy_reading_reports r where r.project_id = p.id) < 100",
}


def psql(sql: str) -> str:
    r = subprocess.run(
        ["docker", "exec", "-i", "supabase-db", "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1"],
        input=sql, capture_output=True, text=True,
    )
    if r.returncode != 0:
        sys.exit(r.stderr)
    return r.stdout


def lot(genre: str, n: int) -> None:
    sql = f"select coalesce(json_agg(x), '[]') from ({REQUETES[genre]} order by 1 limit {int(n)}) x;"
    lignes = json.loads(psql(sql))
    for l in lignes:
        l["genre"] = genre.split("-")[0]
    json.dump(lignes, sys.stdout, ensure_ascii=False, indent=1)


def lots(genre: str, n: int, combien: int, dossier: str) -> None:
    import os
    sql = f"select coalesce(json_agg(x), '[]') from ({REQUETES[genre]} order by 1 limit {int(n) * int(combien)}) x;"
    lignes = json.loads(psql(sql))
    for l in lignes:
        l["genre"] = genre.split("-")[0]
    os.makedirs(dossier, exist_ok=True)
    for i in range(combien):
        part = lignes[i * n:(i + 1) * n]
        if not part:
            break
        with open(os.path.join(dossier, f"lot-{i + 1}.json"), "w") as f:
            json.dump(part, f, ensure_ascii=False, indent=1)
        print(f"lot-{i + 1}.json : {len(part)}")


def poser(fichier: str, lot: str | None = None) -> None:
    donnees = json.load(open(fichier))
    if lot:
        attendus = {(d["id"], d["empreinte"]) for d in json.load(open(lot))}
        avant = len(donnees)
        vus = set()
        donnees = [d for d in donnees if (d.get("id"), d.get("empreinte")) in attendus
                   and not (d["id"] in vus or vus.add(d["id"]))]
        if len(donnees) != avant or len(donnees) != len(attendus):
            print(f"attention : {avant} rendues, {len(donnees)} gardées, {len(attendus)} attendues")

    def lit(s: str) -> str:
        return "'" + s.replace("'", "''") + "'"

    ordres = []
    for d in donnees:
        mots = [m.strip() for m in d.get("mots", []) if m and m.strip()]
        tableau = "array[" + ",".join(lit(m) for m in mots) + "]::text[]" if mots else "'{}'::text[]"
        ordres.append(
            f"select public.poser_mots_cles({lit(d['genre'])}, {lit(d['id'])}::uuid, {tableau}, {lit(d['empreinte'])});"
        )
        if d["genre"] == "projet":
            # La tagline écrite en séance (160 caractères au plus) ; à défaut,
            # copie de la logline si elle fait 140 caractères ou moins.
            # Jamais par-dessus un texte que l'auteur a écrit lui-même.
            tag = (d.get("tagline") or "").strip()
            tag = lit(tag) if tag and len(tag) <= 160 else "null"
            ordres.append(
                "update public.projects set tagline = "
                f"case when {tag} is not null then {tag} when length(btrim(logline)) <= 140 then btrim(logline) end, "
                "tagline_proposee = true "
                f"where id = {lit(d['id'])}::uuid and (tagline is null or tagline_proposee) "
                f"and ({tag} is not null or length(btrim(logline)) <= 140);"
            )
    sortie = psql("begin;\n" + "\n".join(ordres) + "\ncommit;\n")
    liens = sum(int(x) for x in sortie.split() if x.isdigit())
    print(f"{len(donnees)} fiches, {liens} liens posés")


def reste() -> None:
    for genre, sql in REQUETES.items():
        print(genre, psql(f"select count(*) from ({sql}) x;").strip())


if __name__ == "__main__":
    ordre = sys.argv[1] if len(sys.argv) > 1 else ""
    if ordre == "lot":
        lot(sys.argv[2], int(sys.argv[3]))
    elif ordre == "lots":
        lots(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5])
    elif ordre == "poser":
        poser(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    elif ordre == "reste":
        reste()
    else:
        sys.exit(__doc__)
