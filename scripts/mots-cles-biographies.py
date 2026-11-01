#!/usr/bin/env python3
"""
Mots-clés des talents et des personnages, tirés de leur biographie
(29/09/2026). Générés par Claude en séance, par lots : pas de clé d'API
sur le site (décision de Sarah du 19/09).

  python3 scripts/mots-cles-biographies.py lot talent 100 > lot.json   (ou personnage, projet, projet-prioritaire)
      les 100 prochains talents non traités (ou dont la biographie a changé)
  python3 scripts/mots-cles-biographies.py poser resultat.json
      écrit en base : [{"genre": "talent", "id": "…", "empreinte": "…",
      "mots": ["danse", "chant"]}, …]
  python3 scripts/mots-cles-biographies.py lots talent 100 5 dossier/
      prépare 5 lots de 100 (dossier/lot-1.json …), sans chevauchement
  python3 scripts/mots-cles-biographies.py poser resultat.json lot.json
      ne garde que les entrées dont id et empreinte figurent dans le lot
  python3 scripts/mots-cles-biographies.py verifier resultat.json lot.json
      contrôle avant la pose (JSON, ids/empreintes, 5 à 12 mots)
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

# Projets (refait le 01/11/2026) : mots-clés tirés de TOUT ce que la fiche
# donne à lire — titre, format, genre, tagline, logline, « Plus… » (synopsis),
# fiches de lecture (WFG 1 : legacy_reading_reports, WFG 2 : reading_reports),
# biographie de l'auteur. L'empreinte couvre toutes ces sources : un projet
# modifié (ou qui reçoit une fiche de lecture) est repris au lot suivant.
# Les fiches de lecture sont confidentielles : elles nourrissent les mots-clés
# et rien d'autre. Les taglines ne sont plus touchées (plus de tagline posée).
SOURCES_PROJET = """
  select p.id, p.title, p.format, p.genre_slug, p.tagline, p.logline, p.synopsis,
         p.is_public, p.created_at, p.updated_at,
         (select string_agg(
                  concat_ws(E'\\n', left(btrim(r.content), 3500),
                            case when length(btrim(coalesce(r.wfg_review, ''))) > 0
                                 then 'Avis WeFilmGood : ' || left(btrim(r.wfg_review), 800) end),
                  E'\\n---\\n' order by r.read_at desc nulls last, r.legacy_review_id desc)
            from (select * from public.legacy_reading_reports r0
                  where r0.project_id = p.id and length(btrim(coalesce(r0.content, ''))) > 0
                  order by r0.read_at desc nulls last, r0.legacy_review_id desc limit 2) r) as fiches_wfg1,
         (select string_agg(left(btrim(r.content), 3500), E'\\n---\\n' order by r.submitted_at desc nulls last)
            from (select * from public.reading_reports r0
                  where r0.project_id = p.id and length(btrim(coalesce(r0.content, ''))) > 0
                    and r0.status::text in ('soumise', 'validee_admin')
                  order by r0.submitted_at desc nulls last limit 2) r) as fiches_wfg2,
         (select left(btrim(pr.biofilmo), 1200) from public.profiles pr
           where pr.id = p.owner_id and length(btrim(coalesce(pr.biofilmo, ''))) >= 80) as bio,
         md5(concat_ws('|', p.title, p.tagline, p.logline, p.synopsis,
             (select string_agg(coalesce(r.content, '') || coalesce(r.wfg_review, ''), '|' order by r.legacy_review_id)
                from public.legacy_reading_reports r where r.project_id = p.id),
             (select string_agg(coalesce(r.content, ''), '|' order by r.submitted_at, r.id)
                from public.reading_reports r where r.project_id = p.id
                 and r.status::text in ('soumise', 'validee_admin')),
             (select pr.biofilmo from public.profiles pr where pr.id = p.owner_id))) as empreinte
  from public.projects p
"""

PROJETS = """
  select s.id, s.empreinte,
         concat_ws(E'\\n',
           concat_ws(' · ', btrim(s.title), s.format::text, s.genre_slug),
           case when length(btrim(coalesce(s.tagline, ''))) > 0 then 'Tagline : ' || btrim(s.tagline) end,
           case when length(btrim(coalesce(s.logline, ''))) > 0 then 'Logline : ' || left(btrim(s.logline), 1500) end,
           case when length(btrim(coalesce(s.synopsis, ''))) > 0 then 'Plus : ' || left(btrim(s.synopsis), 1000) end,
           case when s.fiches_wfg1 is not null then E'Fiche(s) de lecture (confidentiel) :\\n' || s.fiches_wfg1 end,
           case when s.fiches_wfg2 is not null then E'Fiche(s) de lecture WFG 2 (confidentiel) :\\n' || s.fiches_wfg2 end,
           case when s.bio is not null then E'Biographie de l''auteur (contexte seulement) :\\n' || s.bio end
         ) as texte
  from (""" + SOURCES_PROJET + """) s
  where (length(btrim(coalesce(s.tagline, '') || coalesce(s.logline, '') || coalesce(s.synopsis, ''))) > 0
         or s.fiches_wfg1 is not null or s.fiches_wfg2 is not null)
    and not exists (select 1 from public.mots_cles_traites t
                    where t.genre = 'projet' and t.id = s.id and t.empreinte = s.empreinte)
"""

# D'abord (01/11/2026) les projets publics sans aucun mot-clé et ceux créés ou
# modifiés depuis la passe du 05/10 ; puis le reste.
PRIORITAIRES = """ and s.is_public
    and (not exists (select 1 from public.project_keywords k where k.project_id = s.id)
         or s.created_at >= '2026-10-05' or s.updated_at >= '2026-10-05')"""
REQUETES = {
    "talent": TALENTS,
    "personnage": PERSONNAGES,
    "projet": PROJETS,
    "projet-prioritaire": PROJETS + PRIORITAIRES,
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
        # Depuis le 01/11/2026 la pose ne touche plus la tagline (seulement les mots).
    sortie = psql("begin;\n" + "\n".join(ordres) + "\ncommit;\n")
    liens = sum(int(x) for x in sortie.split() if x.isdigit())
    print(f"{len(donnees)} fiches, {liens} liens posés")


def verifier(fichier: str, lot: str) -> bool:
    """Contrôle un resultat-N.json avant la pose : JSON valide, une entrée par
    projet du lot, id et empreinte recopiés, 5 à 12 mots, pas de tagline."""
    try:
        donnees = json.load(open(fichier))
    except Exception as e:  # noqa: BLE001
        print(f"{fichier} : JSON invalide ({e})")
        return False
    attendus = {(d["id"], d["empreinte"]) for d in json.load(open(lot))}
    rendus = {(d.get("id"), d.get("empreinte")) for d in donnees}
    soucis = []
    if rendus != attendus:
        soucis.append(f"ids/empreintes : {len(attendus - rendus)} manquants, {len(rendus - attendus)} inconnus")
    peu = [d["id"] for d in donnees if len(d.get("mots") or []) < 5]
    trop = [d["id"] for d in donnees if len(d.get("mots") or []) > 12]
    longs = [m for d in donnees for m in (d.get("mots") or []) if not isinstance(m, str) or len(m) > 60 or len(m.split()) > 4]
    if trop:
        soucis.append(f"{len(trop)} entrées avec plus de 12 mots")
    if longs:
        soucis.append(f"mots trop longs : {longs[:5]}")
    if any("tagline" in d for d in donnees):
        soucis.append("une tagline est présente dans la sortie")
    mauvais_genre = [d["id"] for d in donnees if d.get("genre") != "projet"]
    if mauvais_genre:
        soucis.append(f"{len(mauvais_genre)} entrées sans genre projet")
    print(f"{fichier} : {len(donnees)} entrées, {sum(len(d.get('mots') or []) for d in donnees)} mots, "
          f"{len(peu)} entrées à moins de 5 mots" + (" — " + " ; ".join(soucis) if soucis else " — OK"))
    return not soucis


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
    elif ordre == "verifier":
        sys.exit(0 if verifier(sys.argv[2], sys.argv[3]) else 1)
    elif ordre == "reste":
        reste()
    else:
        sys.exit(__doc__)
