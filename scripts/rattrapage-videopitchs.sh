#!/usr/bin/env bash
# Rattrapage des videopitchs déposés (crontab de l'utilisateur wfg, toutes
# les 10 minutes) : conversion de ce qui attend, ménage des envois
# abandonnés. Même jeton que les autres rattrapages, lu dans .env.local.
set -euo pipefail
JETON=$(grep '^HELLOASSO_RATTRAPAGE_JETON=' "$(dirname "$0")/../.env.local" | cut -d= -f2-)
curl -s -m 3600 -X POST -H "Authorization: Bearer $JETON" https://app.wefilmgood.com/api/videopitch/rattrapage
echo
