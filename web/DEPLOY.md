# Déploiement auto-hébergé (serveur Nevisyst)

Ce guide fait tourner l'app Next.js et sa base PostgreSQL sur le serveur Nevisyst
(Docker Compose), exposée sur `coach-nat.nevi-syst.com` via le **tunnel Cloudflare
principal déjà en place** (celui qui sert aussi `immo.nevi-syst.com`,
`n8n.nevi-syst.com`, etc.) — même pattern que ces autres apps : un port publié
sur l'hôte, ciblé par une entrée "Public Hostname" sur ce tunnel.

Tout ce qui suit s'exécute **sur le serveur** (en SSH, ou via code-server sur
`code.nevi-syst.com`), pas dans un environnement cloud.

## 0. Récupérer le code sur le serveur

Le code est sur GitHub, dépôt privé `nevisyst-byte/coach-nat`. Clone-le dans
`/home/flo/docker/coach-nat/` (même emplacement que les autres apps, ex.
`/home/flo/docker/immo/`) :

```bash
cd /home/flo/docker
git clone git@github.com:nevisyst-byte/coach-nat.git coach-nat
# ou en HTTPS avec un token personnel si tu n'as pas de clé SSH configurée :
# git clone https://<ton-token>@github.com/nevisyst-byte/coach-nat.git coach-nat
```

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

Le code avance directement sur GitHub (`nevisyst-byte/coach-nat`, dépôt privé) —
la session qui développe ce projet y pousse ses commits sur la branche `main`.

### En une commande, avec `deploy.sh`

Un seul script récupère la dernière version depuis GitHub **et** relance l'app :

```bash
~/coach-nat/web/deploy.sh
```

Il vérifie qu'il n'y a pas de modifications locales non commitées qui
bloqueraient la fusion, fait le `git pull origin main`, reconstruit et relance
les conteneurs, puis affiche leur état. C'est la commande à lancer depuis ton
téléphone en SSH (ex. via Termius) pour déployer une mise à jour sans PC.

### Mise à jour manuelle, étape par étape

```bash
cd ~/coach-nat
git pull origin main
cd web
docker compose --env-file .env.production up -d --build
```

Le conteneur réappliquera automatiquement les migrations manquantes au
redémarrage (`prisma migrate deploy` est sans danger à rejouer : il applique
uniquement les migrations pas encore appliquées).

Si `git pull` refuse en disant que des modifications locales seraient
écrasées (ça peut arriver si un fichier a été édité à la main directement sur
le serveur) : `git status` pour voir lesquelles, puis soit les committer, soit
les annuler avec `git checkout -- <fichier>` avant de relancer le pull.

### Repli sans réseau (bundle Git)

Si GitHub est injoignable depuis le serveur, ou en cas de souci ponctuel côté
connecteur, l'ancienne méthode par bundle reste disponible : récupère le
fichier `coachnat.bundle` fourni, copie-le sur le serveur, puis :

```bash
~/coach-nat/web/deploy.sh ~/coachnat.bundle
```

## 6. Sauvegardes

Les données PostgreSQL vivent dans le volume Docker `db_data`. Pour un dump
manuel :

```bash
docker compose --env-file .env.production exec db pg_dump -U coachnat coachnat > backup-$(date +%F).sql
```

## 7. Mailing (mot de passe oublié, notifications)

L'app envoie des mails via [Resend](https://resend.com) : réinitialisation de
mot de passe, créneau à couvrir, absence déclarée, rappel d'échéance à venir.
Sans clé API configurée, les mails sont simplement journalisés dans les logs
du conteneur `app` (rien n'est cassé, l'app fonctionne normalement).

### Mettre en place Resend

1. Crée un compte sur [resend.com](https://resend.com) (gratuit jusqu'à 3000
   mails/mois).
2. Onglet **Domains** → ajoute `nevi-syst.com` (ou un sous-domaine dédié,
   ex. `mail.nevi-syst.com`) et suis les instructions pour ajouter les
   enregistrements DNS (SPF/DKIM) chez ton registrar. Sans domaine vérifié,
   Resend ne laisse envoyer qu'à l'adresse mail du compte — inutilisable pour
   de vrais coachs.
3. Onglet **API Keys** → crée une clé, copie-la dans `.env.production` :
   ```
   RESEND_API_KEY=re_xxxxxxxx
   MAIL_FROM=COACH-NAT <notifications@nevi-syst.com>
   APP_URL=https://coach-nat.nevi-syst.com
   ```
4. Relance le conteneur `app` (`docker compose --env-file .env.production up -d app`)
   pour qu'il prenne en compte les nouvelles variables.

### Rappel d'échéances (tâche cron)

Le serveur Next.js self-hosté n'a pas de scheduler intégré : le rappel mail
avant une échéance de saison (compétition, réunion...) est déclenché par un
appel HTTP externe, à faire une fois par jour via `crontab` sur le serveur :

```bash
crontab -e
# tous les jours à 8h :
0 8 * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://coach-nat.nevi-syst.com/api/cron/echeances-rappel
```

Remplace `$CRON_SECRET` par la valeur mise dans `.env.production`. Chaque
échéance ne déclenche qu'un seul rappel (marqué en base une fois envoyé),
donc un appel quotidien suffit même si le job tourne plusieurs jours de
suite avant l'échéance.
