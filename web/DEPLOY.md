# Déploiement auto-hébergé (serveur Nevisyst)

Ce guide fait tourner l'app Next.js et sa base PostgreSQL sur le serveur Nevisyst
(Docker Compose), exposée sur `coach-nat.nevi-syst.com` via le **tunnel Cloudflare
principal déjà en place** (celui qui sert aussi `immo.nevi-syst.com`,
`n8n.nevi-syst.com`, etc.) — même pattern que ces autres apps : un port publié
sur l'hôte, ciblé par une entrée "Public Hostname" sur ce tunnel.

Tout ce qui suit s'exécute **sur le serveur** (en SSH, ou via code-server sur
`code.nevi-syst.com`), pas dans un environnement cloud.

## 0. Récupérer le code sur le serveur

Place le projet dans `/home/flo/docker/coach-nat/` (même emplacement que les
autres apps, ex. `/home/flo/docker/immo/`), par exemple via `git clone` une fois
le dépôt GitHub accessible, ou en dépaquetant l'archive Git fournie.

## 1. Prérequis sur le serveur

- Docker + Docker Compose — déjà installés sur Nevisyst (utilisés par les autres
  services : n8n, Nextcloud, immo…)

## 2. Configurer les secrets

```bash
cd web
cp .env.production.example .env.production
```

Édite `.env.production` et remplace :
- `POSTGRES_PASSWORD` par un mot de passe fort
- `AUTH_SECRET` par une valeur aléatoire longue, par ex. générée avec :
  ```bash
  openssl rand -base64 48
  ```

Ce fichier n'est utilisé que par Docker Compose, il ne touche pas au `.env` de
développement local (`npm run dev` continue de fonctionner comme avant).

## 3. Lancer l'app + la base de données

```bash
docker compose --env-file .env.production up -d --build
```

Au démarrage, le conteneur applique automatiquement les migrations Prisma
(`prisma migrate deploy`) sur une base neuve, puis lance le serveur Next.js.
Vérifie que ça tourne :

```bash
docker compose --env-file .env.production logs -f app
docker compose --env-file .env.production exec app node -e "require('http').get('http://localhost:3000/login',r=>console.log(r.statusCode))"
# doit afficher 200
```

Astuce : ajoute `--env-file .env.production` à **chaque** commande `docker compose`
lancée dans ce dossier (`logs`, `exec`, `down`…), pas seulement au premier `up` —
sinon Compose cherche les variables dans un `.env` par défaut inexistant et
refuse de démarrer les commandes qui en dépendent.

### Charger les données de démonstration (une seule fois, optionnel)

```bash
docker compose --env-file .env.production exec app node node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

Voir `web/README.md` pour la liste des comptes créés par le seed.

## 4. Exposer sur coach-nat.nevi-syst.com

Sur le tunnel principal existant (dashboard Cloudflare Zero Trust → **Networks
→ Tunnels** → le tunnel qui liste déjà `immo.nevi-syst.com`, `n8n.nevi-syst.com`,
etc.), onglet **Public Hostname** :
- Subdomain : `coach-nat`
- Domain : `nevi-syst.com`
- Service : `HTTP` → `172.18.0.1:3010` (même IP de passerelle Docker que les
  autres entrées, ex. `immo.nevi-syst.com` → `172.18.0.1:8090` ; adapte le
  port si tu as changé `APP_PORT` dans `.env.production`)

Le site est alors accessible en HTTPS sur `https://coach-nat.nevi-syst.com`,
sans toucher au reste de la config de ce tunnel.

## 5. Mises à jour

Après un `git pull` de nouveaux changements :

```bash
docker compose --env-file .env.production up -d --build
```

Le conteneur réappliquera automatiquement les migrations manquantes au
redémarrage (`prisma migrate deploy` est sans danger à rejouer : il applique
uniquement les migrations pas encore appliquées).

## 6. Sauvegardes

Les données PostgreSQL vivent dans le volume Docker `db_data`. Pour un dump
manuel :

```bash
docker compose --env-file .env.production exec db pg_dump -U coachnat coachnat > backup-$(date +%F).sql
```
