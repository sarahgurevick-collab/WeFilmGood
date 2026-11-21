#!/usr/bin/env python3
"""Pose les mots-clés des films du CNC (table films_cnc_mots_cles).

  python3 scripts/poser-mots-cles-films.py <dossier>

Le dossier contient lot-N.json (films envoyés) et resultat-N.json (réponse :
[{"id": 123, "mots": [...]}]). Un résultat n'est posé que s'il a exactement
les id de son lot. Rejouable : les mots d'un film sont remplacés.
Consignes de lecture : scripts/mots-cles-consignes-films.md.
"""
import glob, json, os, re, subprocess, sys

d = sys.argv[1]
lignes, refus = [], []
for lot in sorted(glob.glob(os.path.join(d, "lot-*.json"))):
    n = re.search(r"lot-(\d+)", lot).group(1)
    res = os.path.join(d, f"resultat-{n}.json")
    if not os.path.exists(res):
        refus.append(f"lot {n} : pas de résultat"); continue
    try:
        r = json.load(open(res))
        attendus = {x["id"] for x in json.load(open(lot))}
        if {int(x["id"]) for x in r} != attendus or len(r) != len(attendus):
            raise ValueError("id différents du lot")
    except Exception as e:
        refus.append(f"lot {n} : {e}"); continue
    for x in r:
        mots = []
        for m in x.get("mots") or []:
            m = re.sub(r"\s+", " ", str(m)).strip()
            if m and len(m) <= 60 and m.lower() not in {y.lower() for y in mots}:
                mots.append(m)
        lignes.append({"id": int(x["id"]), "mots": mots[:12]})

sql = ("begin;\ncreate temp table t on commit drop as select (j->>'id')::bigint id, j->'mots' mots "
       "from json_array_elements($J$" + json.dumps(lignes, ensure_ascii=False) + "$J$::json) j;\n"
       "delete from films_cnc_mots_cles where film_id in (select id from t);\n"
       "insert into films_cnc_mots_cles (film_id, mot) select t.id, m from t, json_array_elements_text(t.mots) m "
       "on conflict do nothing;\ncommit;\n"
       "select count(distinct film_id), count(*) from films_cnc_mots_cles;")
p = subprocess.run(["docker", "exec", "-i", "supabase-db", "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1"],
                   input=sql, text=True, capture_output=True)
print(p.stdout, p.stderr)
print(len(lignes), "films lus ;", sum(1 for x in lignes if not x["mots"]), "sans mot")
print("\n".join(refus))
