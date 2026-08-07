#!/usr/bin/env bash
#
# HomeQuest — active (ou désactive) le redéploiement automatique.
#
#   Activer :     sudo bash scripts/autodeploy-install.sh
#   Désactiver :  sudo bash scripts/autodeploy-install.sh --disable
#
# Installe un timer systemd qui vérifie toutes les 15 min si la branche suivie
# a de nouveaux commits, et redéploie le cas échéant. Idempotent.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/homequest}"
UNIT_DIR=/etc/systemd/system

log() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }

[ "$(id -u)" = "0" ] || { echo "Lance ce script en root (sudo)."; exit 1; }

if [ "${1:-}" = "--disable" ]; then
  log "Désactivation du redéploiement automatique…"
  systemctl disable --now homequest-deploy.timer 2>/dev/null || true
  rm -f "$UNIT_DIR/homequest-deploy.timer" "$UNIT_DIR/homequest-deploy.service"
  systemctl daemon-reload
  log "Désactivé. Les mises à jour redeviennent manuelles (scripts/install.sh)."
  exit 0
fi

[ -d "$APP_DIR/.git" ] || { echo "$APP_DIR n'est pas un dépôt git — lance d'abord scripts/install.sh."; exit 1; }

# Les unités sont copiées plutôt que liées : un lien vers le dépôt casserait
# si le dossier était déplacé, et systemd n'aime pas les liens cassés.
log "Installation des unités systemd…"
install -m 644 "$APP_DIR/scripts/systemd/homequest-deploy.service" "$UNIT_DIR/"
install -m 644 "$APP_DIR/scripts/systemd/homequest-deploy.timer" "$UNIT_DIR/"

systemctl daemon-reload
systemctl enable --now homequest-deploy.timer

# Le fichier d'état est initialisé sur le commit actuellement déployé, sinon le
# tout premier passage du timer redéploierait inutilement la version en place.
mkdir -p /var/lib/homequest
git -C "$APP_DIR" rev-parse HEAD > /var/lib/homequest/last-deployed-sha

echo
log "Redéploiement automatique actif."
systemctl list-timers homequest-deploy.timer --no-pager || true
echo
echo "   Journal      : journalctl -u homequest-deploy.service -f"
echo "   Forcer       : systemctl start homequest-deploy.service"
echo "   Désactiver   : sudo bash $APP_DIR/scripts/autodeploy-install.sh --disable"
