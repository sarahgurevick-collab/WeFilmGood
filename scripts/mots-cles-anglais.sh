#!/usr/bin/env bash
# L'anglais des mots-clés (08/11/2026).
#
# Les mots-clés (table keywords) sont des données françaises ; le site les
# affiche en anglais quand le globe est sur EN, à partir de keywords.label_en.
# La traduction se fait par lots, par Claude (sous-agents) — pas d'API de
# traduction sur le serveur. Ce script fait les deux bouts :
#
#   scripts/mots-cles-anglais.sh exporter <dossier>
#       écrit <dossier>/lot-NN.tsv (id, thème, mot français), 400 mots par lot,
#       pour les mots sans anglais qui ont un thème, sont posés sur une fiche
#       ou figurent dans un nuage de la fiche.
#   scripts/mots-cles-anglais.sh importer <dossier>
#       lit <dossier>/lot-NN.en.tsv (id, mot anglais), vérifie chaque lot
#       (mêmes ids que l'entrée, deux colonnes, pas de vide) et remplit
#       keywords.label_en pour les mots qui n'en ont pas encore.
#
# À relancer après chaque passe du Finder qui crée des mots-clés nouveaux.
set -euo pipefail
PSQL=(docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
commande="${1:-}"; dossier="${2:-}"
[[ -n "$commande" && -n "$dossier" ]] || { echo "usage : $0 exporter|importer <dossier>" >&2; exit 1; }
mkdir -p "$dossier"

if [[ "$commande" == "exporter" ]]; then
  "${PSQL[@]}" -AtF $'\t' -c "
    select k.id, coalesce(k.theme, '-'), k.label_fr
    from public.keywords k
    where k.label_en is null
      and (k.theme is not null
           or exists (select 1 from public.project_keywords pk where pk.keyword_id = k.id)
           or exists (select 1 from public.nuages_mots_cles n where n.slug = k.slug))
    order by k.id" > "$dossier/tous.tsv"
  rm -f "$dossier"/lot-*.tsv
  ( cd "$dossier" && split -l 400 -d -a 2 --additional-suffix=.tsv tous.tsv lot- )
  echo "$(wc -l < "$dossier/tous.tsv") mots à traduire, $(ls "$dossier"/lot-*.tsv 2>/dev/null | grep -vc '\.en\.tsv' || true) lots dans $dossier"
  exit 0
fi

if [[ "$commande" == "importer" ]]; then
  tmp="$dossier/_import.tsv"; : > "$tmp"
  for en in "$dossier"/lot-*.en.tsv; do
    fr="${en%.en.tsv}.tsv"
    [[ -f "$fr" ]] || { echo "ignoré : $en sans $fr" >&2; continue; }
    if ! cmp -s <(cut -f1 "$fr") <(cut -f1 "$en"); then echo "REFUSÉ : les ids de $en ne suivent pas $fr" >&2; exit 2; fi
    if awk -F'\t' 'NF != 2 || $2 == "" || length($2) > 80 { mauvais = 1 } END { exit mauvais }' "$en"; then :; else echo "REFUSÉ : ligne mal formée dans $en" >&2; exit 2; fi
    cat "$en" >> "$tmp"
  done
  avant=$("${PSQL[@]}" -Atc "select count(*) from public.keywords where label_en is not null")
  # Un seul script psql : la table temporaire, les données (COPY depuis
  # l'entrée, terminées par « \. »), puis la mise à jour des mots sans anglais.
  {
    echo "create temporary table _anglais (id bigint primary key, label_en text not null);"
    echo "copy _anglais from stdin with (format text);"
    cat "$tmp"
    echo '\.'
    echo "update public.keywords k set label_en = btrim(a.label_en) from _anglais a where a.id = k.id and k.label_en is null and btrim(a.label_en) <> '';"
  } | "${PSQL[@]}"
  apres=$("${PSQL[@]}" -Atc "select count(*) from public.keywords where label_en is not null")
  rm -f "$tmp"
  echo "mots avec anglais : $avant → $apres"
  exit 0
fi
echo "commande inconnue : $commande" >&2; exit 1
