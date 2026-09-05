# Déploiement auto-hébergé (serveur Nevisyst + tunnel Cloudflare dédié)

Ce guide fait tourner l'app Next.js et sa base PostgreSQL sur le serveur Nevisyst
(Docker Compose), avec un **tunnel Cloudflare dédié `coach-nat`** (conteneur
`cloudflared` inclus dans le même `docker-compose.yml`) qui expose le site sur
`coach-nat.nevi-syst.com`. Ce tunnel est indépendant de celui qui sert déjà
`immo.nevi-syst.com`, `n8n.nevi-syst.com`, etc. — rien à toucher sur l'infra
existante (tunnel principal, Nginx Proxy Manager).

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

Laisse `CLOUDFLARE_TUNNEL_TOKEN` avec sa valeur d'exemple pour l'instant — tu
le récupères à l'étape 4. En attendant, seul le conteneur `cloudflared`
redémarrera en échec (app et base de données démarrent normalement).

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

## 4. Créer le tunnel Cloudflare dédié et lancer

1. Dans le dashboard **Cloudflare Zero Trust** : **Networks → Tunnels → Create
   a tunnel** → type **Cloudflared** → nomme-le `coach-nat`.
2. À l'étape "Choose your environment", sélectionne **Docker**. Cloudflare
   affiche une commande du type :
   ```
   docker run cloudflare/cloudflared:latest tunnel run --token eyJhIjo...
   ```
   Copie uniquement la valeur après `--token`.
3. Toujours dans l'assistant Cloudflare, onglet **Public Hostname** : ajoute
   - Subdomain : `coach-nat`
   - Domain : `nevi-syst.com`
   - Service : `HTTP` → `app:3000`

   (`app` est le nom du service Docker de `docker-compose.yml` — le conteneur
   `cloudflared` du compose le rejoint sur le même réseau et peut l'appeler
   directement par ce nom, pas besoin d'IP ni de port hôte.)
4. Sur le serveur, remplace la valeur de `CLOUDFLARE_TUNNEL_TOKEN` dans
   `.env.production` par ce token (édite le fichier, ne fais pas un simple
   `echo >>` qui dupliquerait la ligne).
5. Relance pour prendre en compte le token :
   ```bash
   docker compose --env-file .env.production up -d
   docker compose --env-file .env.production logs -f cloudflared   # doit afficher "Registered tunnel connection"
   ```

Le site est alors accessible en HTTPS sur `https://coach-nat.nevi-syst.com`,
sans aucun port ouvert sur le serveur, et sans toucher au tunnel principal ni
au Nginx Proxy Manager déjà utilisés par tes autres services.

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
