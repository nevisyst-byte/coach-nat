# Déploiement auto-hébergé (serveur Nevisyst + Cloudflare Tunnel existant)

Ce guide fait tourner l'app Next.js et sa base PostgreSQL sur le serveur Nevisyst
(Docker Compose), puis les expose sur `coach-nat.nevi-syst.com` en réutilisant le
tunnel Cloudflare et le Nginx Proxy Manager déjà en place sur ce serveur (même
principe que l'app `immo`) — pas besoin de créer un nouveau tunnel ni un nouveau
nom de domaine.

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
docker compose logs -f app
curl -I http://localhost:3010/login   # doit répondre 200
```

### Charger les données de démonstration (une seule fois, optionnel)

```bash
docker compose exec app node_modules/.bin/tsx prisma/seed.ts
```

Voir `web/README.md` pour la liste des comptes créés par le seed.

## 4. Exposer le site sur coach-nat.nevi-syst.com

Le serveur a déjà un tunnel Cloudflare + un Nginx Proxy Manager (NPM, sur
`192.168.1.39:81`) qui routent les sous-domaines `*.nevi-syst.com` vers les
conteneurs (c'est ce qui sert déjà `immo.nevi-syst.com`, `n8n.nevi-syst.com`,
etc.). Pour ajouter `coach-nat`, pas besoin de toucher au tunnel — seulement à
NPM et, si besoin, à un enregistrement DNS.

1. **Vérifie l'accessibilité réseau** : NPM (conteneurisé) doit pouvoir
   atteindre le conteneur `app` de coach-nat. Deux options :
   - le plus simple : le port est déjà publié sur l'hôte
     (`docker-compose.yml` → `${APP_PORT:-3010}:3000`), donc NPM peut cibler
     `192.168.1.39:3010` directement ;
   - plus propre : attacher le service `app` au même réseau Docker externe que
     NPM (voir le bloc commenté dans `docker-compose.yml`) et cibler le
     conteneur par son nom de service Docker (`app:3000`) — regarde sur quel
     réseau tourne ton conteneur NPM avec `docker inspect <conteneur-npm>`.

2. **Ajoute un Proxy Host dans NPM** (`http://192.168.1.39:81`, comme pour les
   autres apps) :
   - Domain Names : `coach-nat.nevi-syst.com`
   - Forward Hostname/IP : `192.168.1.39` (ou le nom du service Docker si tu as
     choisi l'option réseau partagé)
   - Forward Port : `3010` (ou `3000` si réseau partagé)
   - Active "Websockets Support"
   - Onglet SSL : demande un certificat Let's Encrypt (ou réutilise le
     wildcard existant si tu en as un pour `*.nevi-syst.com`)

3. **DNS** : si tu as déjà un enregistrement DNS `*.nevi-syst.com` (wildcard)
   pointant vers le tunnel Cloudflare, `coach-nat.nevi-syst.com` fonctionne
   sans rien faire de plus. Sinon, ajoute un enregistrement DNS
   `coach-nat.nevi-syst.com` (CNAME vers le même tunnel que les autres
   sous-domaines) dans le dashboard Cloudflare, ou via
   `cloudflared tunnel route dns <nom-du-tunnel-existant> coach-nat.nevi-syst.com`
   sur le serveur.

Le site est alors accessible en HTTPS sur `https://coach-nat.nevi-syst.com`,
sans port supplémentaire ouvert sur le serveur.

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
