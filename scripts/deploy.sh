#!/usr/bin/env bash
#
# HomeQuest — redéploiement automatique quand la branche suivie a bougé.
#
# Appelé par le timer systemd (voir scripts/autodeploy-install.sh). Peut aussi
# se lancer à la main : sudo bash /opt/homequest/scripts/deploy.sh
#
# Ne fait rien si aucun nouveau commit n'a été déployé avec succès.
#
# Tout le corps est dans une fonction appelée en dernière ligne : bash lit ses
# scripts au fil de l'eau, or ce fichier est lui-même remplacé par le `git pull`
# qu'il déclenche. L'encapsuler garantit qu'il est intégralement parsé avant
# la première modification du disque.
#
set -euo pipefail

main() {
  APP_DIR="${APP_DIR:-/opt/homequest}"
  BRANCH="${DEPLOY_BRANCH:-main}"
  STATE_DIR="${STATE_DIR:-/var/lib/homequest}"
  STATE_FILE="$STATE_DIR/last-deployed-sha"

  cd "$APP_DIR"

  git fetch --quiet origin "$BRANCH"
  remote_sha=$(git rev-parse "origin/$BRANCH")

  # On compare au dernier SHA *effectivement déployé*, pas au HEAD local : si un
  # build échoue après le pull, HEAD a déjà avancé et la tentative ne serait
  # jamais reprise. Avec ce fichier d'état, le prochain passage du timer réessaie.
  mkdir -p "$STATE_DIR"
  last_deployed=$(cat "$STATE_FILE" 2>/dev/null || true)

  if [ "$last_deployed" = "$remote_sha" ]; then
    echo "Rien à faire (déjà déployé : ${remote_sha:0:7})."
    exit 0
  fi

  echo "Nouveau commit sur $BRANCH : ${remote_sha:0:7} — déploiement…"
  git pull --ff-only origin "$BRANCH"

  # Même logique que install.sh : la surcouche Caddy n'est chargée qu'en HTTPS.
  COMPOSE=(-f docker-compose.yml)
  if grep -q '^APP_DOMAIN=' .env 2>/dev/null; then
    COMPOSE+=(-f docker-compose.prod.yml)
  fi

  # Si le build échoue, compose sort en erreur *avant* de recréer quoi que ce
  # soit : les conteneurs en place continuent de tourner sur l'ancienne image.
  docker compose "${COMPOSE[@]}" up -d --build

  # Sans ça, chaque build laisse une image orpheline et le disque se remplit
  # silencieusement au fil des mois. `prune -f` ne touche qu'aux images
  # « dangling », jamais à celles utilisées par un conteneur.
  docker image prune -f

  echo "$remote_sha" > "$STATE_FILE"
  echo "Déployé : ${remote_sha:0:7}"
}

main "$@"
