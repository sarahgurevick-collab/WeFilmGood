#!/usr/bin/env bash
# Pose le jeton Vimeo dans .env.local sans jamais l'afficher, puis vérifie
# auprès de Vimeo qu'il marche (compte, droits accordés).
# Usage : bash scripts/poser-jeton-vimeo.sh   — le jeton est tapé à l'aveugle.
set -euo pipefail
cd "$(dirname "$0")/.."

read -rsp "Collez le jeton Vimeo puis Entrée (rien ne s'affiche, c'est normal) : " jeton
echo
jeton="${jeton//[[:space:]]/}"
if [ -z "$jeton" ]; then echo "Rien reçu, rien changé."; exit 1; fi

reponse=$(curl -s -H "Authorization: bearer $jeton" -H "Accept: application/vnd.vimeo.*+json;version=3.4" https://api.vimeo.com/oauth/verify)
if ! echo "$reponse" | jq -e '.user.name' >/dev/null 2>&1; then
  echo "Vimeo refuse ce jeton :"; echo "$reponse" | jq -r '.error // .' 2>/dev/null || echo "$reponse"
  echo "Rien n'a été enregistré."; exit 1
fi

nom=$(echo "$reponse" | jq -r '.user.name')
compte=$(echo "$reponse" | jq -r '.user.account')
droits=$(echo "$reponse" | jq -r '.scope')
echo "Jeton reconnu : compte « $nom » (formule $compte)."
echo "Droits accordés : $droits"
for d in public private create edit delete upload; do
  case " $droits " in *" $d "*) ;; *) echo "  ⚠ il manque le droit « $d »" ;; esac
done

if grep -q '^VIMEO_TOKEN=' .env.local 2>/dev/null; then
  sed -i "s|^VIMEO_TOKEN=.*|VIMEO_TOKEN=$jeton|" .env.local
  echo "VIMEO_TOKEN remplacé dans .env.local."
else
  printf '\n# Vimeo (dépôt et validation des videopitchs)\nVIMEO_TOKEN=%s\n' "$jeton" >> .env.local
  echo "VIMEO_TOKEN ajouté à .env.local."
fi
