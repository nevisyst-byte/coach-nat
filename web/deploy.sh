#!/bin/bash
# Applique un nouveau bundle Git et relance l'app en une seule commande.
#
# Usage (depuis n'importe où, typiquement /home/flo) :
#   ~/coach-nat/web/deploy.sh ~/coachnat.bundle
#
# Ou sans argument si le bundle est déjà à l'emplacement habituel :
#   ~/coach-nat/web/deploy.sh
set -euo pipefail

BUNDLE="${1:-$HOME/coachnat.bundle}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$BUNDLE" ]; then
  echo "Bundle introuvable : $BUNDLE"
  echo "Passe le chemin en argument : $0 /chemin/vers/coachnat.bundle"
  exit 1
fi

echo "==> Dépôt : $REPO_DIR"
echo "==> Bundle : $BUNDLE"

cd "$REPO_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "==> Des modifications locales non commitées existent, elles bloqueraient la fusion."
  echo "    git status :"
  git status --short
  echo "==> Corrige ça avant de relancer (git checkout -- <fichier> pour les annuler si elles ne sont pas voulues)."
  exit 1
fi

echo "==> git pull du bundle..."
git pull "$BUNDLE" main

echo "==> Reconstruction et redémarrage des conteneurs..."
cd "$REPO_DIR/web"
docker compose --env-file .env.production up -d --build --remove-orphans

echo "==> État des conteneurs :"
docker compose --env-file .env.production ps

echo "==> Terminé."
