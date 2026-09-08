#!/bin/bash
# Récupère la dernière version du code et relance l'app en une seule commande.
#
# Usage normal (depuis n'importe où, typiquement /home/flo) :
#   ~/coach-nat/web/deploy.sh
# → récupère la dernière version depuis GitHub (origin/main) et redéploie.
#
# Repli sans réseau GitHub (bundle fourni manuellement) :
#   ~/coach-nat/web/deploy.sh ~/coachnat.bundle
set -euo pipefail

BUNDLE="${1:-}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Dépôt : $REPO_DIR"
cd "$REPO_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "==> Des modifications locales non commitées existent, elles bloqueraient la fusion."
  echo "    git status :"
  git status --short
  echo "==> Corrige ça avant de relancer (git checkout -- <fichier> pour les annuler si elles ne sont pas voulues)."
  exit 1
fi

if [ -n "$BUNDLE" ]; then
  if [ ! -f "$BUNDLE" ]; then
    echo "Bundle introuvable : $BUNDLE"
    exit 1
  fi
  echo "==> git pull du bundle $BUNDLE..."
  git pull "$BUNDLE" main
else
  echo "==> git pull depuis GitHub (origin/main)..."
  git pull origin main
fi

echo "==> Reconstruction et redémarrage des conteneurs..."
cd "$REPO_DIR/web"
docker compose --env-file .env.production up -d --build --remove-orphans

echo "==> État des conteneurs :"
docker compose --env-file .env.production ps

# Chaque build multi-stage (npm install + next build) empile du cache et une
# image web-app sans jamais nettoyer les anciennes — sur la durée, ça a fini
# par représenter des dizaines de Go de disque. Ne touche qu'aux images non
# référencées et à l'excédent de cache de build, jamais aux conteneurs ni
# images des autres apps du serveur (ollama, n8n, immo...).
echo "==> Nettoyage des images et du cache de build obsolètes..."
docker image prune -f
docker builder prune -f --keep-storage 2gb

echo "==> Terminé."
