# Déploiement auto-hébergé (serveur local + Cloudflare Tunnel)

Ce guide fait tourner l'app Next.js et sa base PostgreSQL sur ta propre machine
(Docker Compose), puis les expose publiquement via un tunnel Cloudflare — sans
ouvrir de port sur ta box ni exposer ton IP.

Tout ce qui suit s'exécute **sur le serveur local**, pas dans un environnement cloud.

## 1. Prérequis sur le serveur

- [Docker](https://docs.docker.com/engine/install/) + Docker Compose (inclus dans
  Docker Desktop, ou le plugin `docker-compose-plugin` sur Linux)
- Un compte Cloudflare (gratuit) — pas besoin de nom de domaine pour commencer

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
docker compose logs -f app
curl -I http://localhost:3000/login   # doit répondre 200
```

### Charger les données de démonstration (une seule fois, optionnel)

```bash
docker compose exec app node_modules/.bin/tsx prisma/seed.ts
```

Voir `web/README.md` pour la liste des comptes créés par le seed.

## 4. Exposer le site avec Cloudflare Tunnel

### Option A — tester tout de suite, sans domaine (URL temporaire)

```bash
# Installer cloudflared (Linux Debian/Ubuntu) :
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Lancer un tunnel rapide vers l'app locale :
cloudflared tunnel --url http://localhost:3000
```

Cloudflare affiche une URL du type `https://xxxx-xxxx.trycloudflare.com` — elle
est utilisable immédiatement, mais **change à chaque relance** de la commande.
Pratique pour vérifier que tout fonctionne avant d'engager un domaine.

### Option B — une fois que tu as un nom de domaine sur Cloudflare

1. Ajoute ton domaine à ton compte Cloudflare (DNS géré par eux).
2. Authentifie `cloudflared` (ouvre un navigateur) :
   ```bash
   cloudflared tunnel login
   ```
3. Crée un tunnel nommé et persistant :
   ```bash
   cloudflared tunnel create coach-nat
   cloudflared tunnel route dns coach-nat coach-nat.ton-domaine.fr
   ```
4. Crée `~/.cloudflared/config.yml` :
   ```yaml
   tunnel: coach-nat
   credentials-file: /root/.cloudflared/<TUNNEL-ID>.json
   ingress:
     - hostname: coach-nat.ton-domaine.fr
       service: http://localhost:3000
     - service: http_status:404
   ```
5. Lance-le en service persistant :
   ```bash
   cloudflared tunnel run coach-nat
   # ou, pour qu'il démarre au boot :
   sudo cloudflared service install
   ```

Le site est alors accessible en HTTPS sur `https://coach-nat.ton-domaine.fr`,
sans aucun port ouvert sur le serveur.

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
docker compose exec db pg_dump -U coachnat coachnat > backup-$(date +%F).sql
```
