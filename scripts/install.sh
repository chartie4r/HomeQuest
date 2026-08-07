#!/usr/bin/env bash
#
# HomeQuest — installation « one-command » pour VPS Ubuntu/Debian (ex. Hostinger).
#
#   HTTP simple (LAN / http://IP:3000) :
#     sudo bash scripts/install.sh
#
#   HTTPS automatique (domaine pointant sur le VPS) :
#     sudo APP_DOMAIN=quest.mondomaine.com bash scripts/install.sh
#
# Réexécuter le script = met à jour le code et redéploie (idempotent).
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/chartie4r/HomeQuest.git}"
APP_DIR="${APP_DIR:-/opt/homequest}"
APP_DOMAIN="${APP_DOMAIN:-}"

log()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }

[ "$(id -u)" = "0" ] || { echo "Lance ce script en root (sudo)."; exit 1; }

# 1) Swap si peu de RAM (le build Nuxt est gourmand ~1,5 Go)
mem_kb=$(awk '/MemTotal/{print $2}' /proc/meminfo)
swap_kb=$(awk '/SwapTotal/{print $2}' /proc/meminfo)
if [ "${mem_kb:-0}" -lt 2000000 ] && [ "${swap_kb:-0}" -eq 0 ]; then
  log "RAM < 2 Go et pas de swap — création d'un swap de 2 Go…"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 2) Docker + Compose v2
if ! command -v docker >/dev/null 2>&1; then
  log "Installation de Docker…"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 requis."; exit 1; }
command -v git >/dev/null 2>&1 || { apt-get update -y && apt-get install -y git; }

# 3) Récupération du code
if [ -d "$APP_DIR/.git" ]; then
  log "Mise à jour du dépôt ($APP_DIR)…"
  git -C "$APP_DIR" pull --ff-only
else
  log "Clonage dans $APP_DIR…"
  mkdir -p "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# 4) Fichier .env (secret de session généré une seule fois)
if [ ! -f .env ]; then
  log "Génération de .env…"
  echo "NUXT_SESSION_PASSWORD=$(openssl rand -base64 48 | tr -d '\n')" > .env
fi
if [ -n "$APP_DOMAIN" ]; then
  if grep -q '^APP_DOMAIN=' .env; then
    sed -i "s|^APP_DOMAIN=.*|APP_DOMAIN=$APP_DOMAIN|" .env
  else
    echo "APP_DOMAIN=$APP_DOMAIN" >> .env
  fi
fi

# 5) Déploiement
COMPOSE=(-f docker-compose.yml)
if grep -q '^APP_DOMAIN=' .env; then
  COMPOSE+=(-f docker-compose.prod.yml)
fi

log "Build et démarrage (peut prendre quelques minutes)…"
docker compose "${COMPOSE[@]}" up -d --build

echo
log "HomeQuest est déployé."
if grep -q '^APP_DOMAIN=' .env; then
  dom=$(grep '^APP_DOMAIN=' .env | cut -d= -f2-)
  echo "   → https://$dom  (certificat TLS automatique via Caddy)"
  warn "Assure-toi que le DNS de $dom pointe vers ce VPS, et que les ports 80/443 sont ouverts."
else
  ip=$(curl -fsS https://api.ipify.org 2>/dev/null || echo "IP_DU_VPS")
  echo "   → http://$ip:3000"
  warn "Accès en HTTP simple : réserve-le au réseau local. Pour Internet, relance avec APP_DOMAIN=..."
fi
echo "   Profil de démo : « Démo » / NIP 1234 — à supprimer une fois tes profils créés."
