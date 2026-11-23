#!/usr/bin/env bash
# Passage de nuit des matchs entre projets (crontab de l'utilisateur wfg) :
# chaque projet dont l'auteur a rempli ses trois thèmes de mots-clés retrouve
# son projet le plus proche. Même jeton que le rattrapage HelloAsso.
set -euo pipefail
JETON=$(grep '^HELLOASSO_RATTRAPAGE_JETON=' "$(dirname "$0")/../.env.local" | cut -d= -f2-)
curl -s -m 3600 -X POST -H "Authorization: Bearer $JETON" https://app.wefilmgood.com/api/matchs/rattrapage
echo
