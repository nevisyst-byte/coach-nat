# COACH-NAT — Portail coachs

Implémentation réelle (Next.js 16 / TypeScript / Prisma / PostgreSQL) du prototype
Claude Design `Portail COACH-NAT.dc.html` (voir `../project/`, `../chats/`, `../README.md`
à la racine du dépôt pour le contexte du design d'origine).

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **PostgreSQL** via **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **Authentification maison** : cookie de session signé (JWT via `jose`), mots de passe
  hashés avec `bcryptjs`. Deux rôles : `ADMIN` et `COACH`.
- **Tailwind CSS v4** avec les tokens du design system du prototype (couleurs, typographie
  Barlow / Barlow Condensed) portés dans `src/app/globals.css`.

## Démarrer en local

```bash
# 1. Base de données Postgres (adapter DATABASE_URL dans .env si besoin)
createuser coachnat --pwprompt   # ou utiliser un rôle existant
createdb coachnat -O coachnat

# 2. Dépendances
npm install --legacy-peer-deps   # requis à cause d'un bug npm 10 sans rapport avec le projet

# 3. Schéma + données de démonstration
npx prisma migrate dev
npx tsx prisma/seed.ts

# 4. Lancer
npm run dev
```

Pour un déploiement auto-hébergé (Docker Compose + Cloudflare Tunnel), voir
[`DEPLOY.md`](./DEPLOY.md).

Comptes créés par le seed (mot de passe `coachnat123` pour tous) :

| Rôle | Email |
| --- | --- |
| Administrateur | `admin@coach-nat.fr` |
| Coach | `marie.lefort@coach-nat.fr` |
| Coach | `thomas.girard@coach-nat.fr` |
| Coach | `lea.morel@coach-nat.fr` |
| Coach | `paul.nadal@coach-nat.fr` |

## Écrans implémentés

Tous les écrans du prototype desktop, en responsive (barre latérale + bandeau photo
sur desktop, barre d'onglets en bas sur mobile) :

- **Tableau de bord** (`/general`) — vue générale / vue coach fusionnées derrière un
  bouton bascule (`?vue=coach`), comme dans la dernière version du prototype
- **Planning** (`/planning`) — vue globale / mon planning fusionnées derrière le même
  mécanisme (`?vue=moi`), avec un bouton « Déclarer une absence » (modale persistant
  une `Absence` nageur ou un `Conge` coach selon le « Qui » sélectionné)
- Stages (planning de la semaine par stage, créneaux multiples/jour, création de stage,
  cartes avec bandeau photo)
- Présences (pointage nageurs par séance + panneau « Séance prévue » qui affiche le
  contenu réellement généré pour cette occurrence, avec repli si rien n'est planifié)
- Calendrier (mois en cours avec étiquettes d'évènements par jour + échéances de saison)
- Nageurs (regroupés par pôle réel `Groupe.pole`, filtre pôle + recherche ; fiche :
  cotation FFN, notation technique par nage, modale de notation persistée)
- Absences & congés
- Créateur de séance (génération de séance à partir de variant/intensité/nage/volume)
- Thématiques d'entraînement (génération de cycle + 3 graphiques)
- **Administration** (`/admin`, réservé au rôle `ADMIN`) : comptes, groupes,
  nageurs, effectifs par catégorie, échéances de saison

Les anciennes routes séparées `/coach` et `/mon-planning` restent en place comme de
simples redirections vers les écrans fusionnés ci-dessus, pour ne pas casser de liens
existants.

## Modèle de séance daté (`SeanceInstance`)

Un `Creneau` (ou `CreneauStage`) ne représente qu'un horaire récurrent — il ne suffit pas
à lui seul pour du suivi réel. Chaque fois qu'une séance a effectivement lieu à une date
précise, une `SeanceInstance` est créée (ou retrouvée) pour cette occurrence :

- **Présences** (`/presences`) sont rattachées à une `SeanceInstance`, pas au créneau
  générique : le sélecteur de séance + le navigateur de date (semaine précédente/suivante
  pour un créneau régulier, jour par jour pour un créneau de stage) résolvent la bonne
  occurrence datée, créée à la volée si besoin. L'historique de pointage est donc réel et
  daté, pas seulement "l'état courant" d'un créneau.
- **Créateur de séance** (`/seance`) : « Planifier la séance » crée une `SeanceInstance`
  à la date choisie (variant, intensité, nage, volume réellement nagé) — distinct
  d'« Enregistrer le modèle » qui sauvegarde juste un gabarit réutilisable sans date.
- **Répartition de la charge** (tableau de bord coach) agrège désormais les vraies
  `SeanceInstance` du coach sur la période choisie (4/8 semaines, saison) par nage,
  intensité et variant — un état vide s'affiche tant qu'aucune séance n'a été planifiée.
- **Assiduité** (fiche nageur) calcule un vrai graphique hebdomadaire à partir des
  présences datées des 8 dernières semaines, plutôt que d'inventer un historique.

Le seed (`prisma/seed.ts`) génère 8 semaines d'historique réaliste (séances + présences)
pour les créneaux réguliers, afin que ces écrans ne soient pas vides en développement.

## Synchronisation avec le design mis à jour

Le prototype `.dc.html` a évolué après l'implémentation initiale (fusion des tableaux
de bord, fusion des plannings, restructuration de la page Nageurs par pôle, ajout de
la modale « Déclarer une absence », remplacement du panneau Encadrement par « Séance
prévue » sur `/presences`, bandeaux photo sur les cartes de stage, refonte visuelle
globale — ombres, sidebar avec photo de fond, badges d'icônes). Tout a été porté ici,
avec une différence volontaire par rapport au prototype statique : la modale
« Déclarer une absence » persiste réellement une `Absence` ou un `Conge` via
`POST /api/absences` (le prototype se contentait de fermer la modale sans rien
enregistrer).

## Vacances scolaires, créneaux en pause et stages au planning

Chaque `Creneau` récurrent porte un flag `actifHorsVacances` (vrai par défaut) : le
planning le met visuellement en pause pendant les semaines de vacances scolaires de
la zone du club (réglable dans `/admin`, réglage `AppSettings.zoneScolaire`), et
bascule le flag en cliquant sur le lien sous chaque créneau pour ceux qui continuent
toute l'année (ex. Masters). Sur ces mêmes semaines, les stages dont les dates
(`Stage.dateDebut`/`dateFin`, `StageJour.date`) recouvrent la semaine affichée
apparaissent directement dans la grille, à côté des créneaux habituels.

Le calendrier scolaire (`src/lib/vacances-scolaires.ts`) est **saisi à la main**, pas
synchronisé en direct avec une source officielle — voir l'avertissement en tête de ce
fichier. À vérifier sur https://www.education.gouv.fr/calendrier-scolaire et à mettre
à jour chaque année scolaire.

## Synchronisation FFN (fiche nageur)

Depuis la fiche nageur (onglet « Cotation FFN »), un coach peut relier un nageur à sa
fiche sur `ffn.extranat.fr` (recherche par nom, via le vrai endpoint JSON du site,
`_recherche.php`) puis synchroniser ses meilleures performances personnelles (MPP),
25m et 50m confondus. Le nageur garde son IUF (`Nageur.ffnIuf`) pour resynchroniser
sans redemander une recherche.

Il n'existe pas d'API officielle pour les performances elles-mêmes : `src/lib/ffn.ts`
parse le HTML de la page de résultats (`nat_recherche.php?idopt=mpp`) avec `cheerio`.
Le parsing a été construit et testé contre un vrai échantillon HTML fourni pendant le
développement (un bug réel — cheerio enveloppe les `<tr>` orphelins dans un `<tbody>`
implicite, comme un navigateur — a été trouvé et corrigé grâce à ce test), mais **la
requête réseau elle-même n'a jamais pu être testée en conditions réelles** : l'environnement
où ce code a été écrit n'a aucun accès internet sortant. Le premier test réel se fera
depuis le serveur de prod. Si `ffn.extranat.fr` change la structure de sa page, le
parsing peut casser silencieusement (0 performance importée, sans erreur) — voir le
commentaire en tête de `src/lib/ffn.ts`.

Une synchronisation **remplace entièrement** les `Performance` existantes du nageur
(pas de fusion) — les entrées éventuellement saisies à la main pour ce nageur seraient
donc écrasées. `deltaSaison` et `rangNat` (colonnes historiques de l'écran, issues du
prototype) ne sont pas fournies par la page FFN scrapée et restent à `"—"`.

## Saisons et historique multi-saison

Un modèle `Saison` (ex. "2026-2027") porte une seule saison "active" à la fois — c'est elle qui
détermine le badge affiché dans l'en-tête, la saison sur laquelle portent les nouvelles
inscriptions, et celle que la synchronisation FFN vient compléter. Contrairement à
`Nageur.groupeId` (toujours "en direct"), le modèle `Inscription` garde, pour chaque nageur et
chaque saison, une photo du groupe et du coach à ce moment-là : changer le groupe d'un nageur ne
réécrit donc plus l'historique des saisons précédentes. Cet historique (visible dans l'onglet
« Évolution » de la fiche nageur, avec la date d'arrivée au club si renseignée) est mis à jour
automatiquement à chaque création/modification de nageur depuis `/admin`.

La synchronisation FFN a été corrigée dans la foulée : elle ne remplace désormais que les
performances de la saison active (`Performance.saison`), au lieu d'écraser tout l'historique à
chaque resynchro — l'onglet « Évolution » peut ainsi montrer le temps d'un nageur sur une épreuve
donnée, saison après saison.

Démarrer une nouvelle saison se fait depuis `/admin` → section Saisons → « Nouvelle saison », avec
une case à cocher optionnelle « Réinitialiser nageurs, créneaux et stages » (confirmation par
saisie du mot RÉINITIALISER) pour repartir de zéro sur le roster et le planning en gardant les
groupes (structure stable du club), les comptes utilisateurs et l'historique des séances/présences
déjà pointées.

## Simplifications restantes

- **Créneaux récurrents sans exception au jour près** : au-delà de la pause automatique
  pendant les vacances scolaires, il n'y a pas encore de mécanisme pour annuler ou
  déplacer une seule occurrence ponctuelle (hors vacances) sans toucher aux suivantes.
- **Stages existants sans dates réelles** : les stages créés avant cette évolution (ou
  encore non édités) ont `dateDebut`/`dateFin` à `null` — ils n'apparaissent pas dans le
  recoupement automatique avec les vacances tant qu'on ne leur donne pas de vraies dates
  (le formulaire de création en demande désormais, mais rien ne force la mise à jour des
  anciens stages).
- **Libellé de groupe en texte libre sur les créneaux de stage** : `CreneauStage.groupe`
  est une chaîne libre (ex. « Élite »), qui ne correspond pas toujours exactement au nom
  d'un `Groupe` réel (ex. « Compétition Élite »). Tant que les libellés ne sont pas
  alignés (ou le champ transformé en relation), la feuille de présence d'un créneau de
  stage peut afficher « Aucune personne rattachée » même quand un groupe existe.
- **Podium** : le prototype affichait un "podium des progressions" basé sur un delta de
  temps fictif non stocké. Faute d'historique de performance daté, l'écran général
  affiche à la place un podium des meilleurs points FFN actuels.
- Les effectifs par pôle affichent des totaux club réalistes (312 licenciés) issus de
  `CategorieEffectif` (éditables dans l'admin), alors que le roster détaillé ne modélise
  que 8 nageurs nommés (comme le prototype) — les deux ne sont pas censés se recouper.
- **Congé déclaré via la modale d'absence** : le modèle `Conge` a un champ `impact`
  obligatoire (ex. « 5 créneaux Sauvetage à couvrir ») que le prototype ne demande pas
  à la déclaration ; la modale enregistre `"À évaluer"` par défaut, à affiner ensuite
  depuis `/absences`.

## Structure

```
prisma/schema.prisma       Schéma de données
prisma/seed.ts             Données de démonstration (reprises du prototype)
src/lib/                   Auth, Prisma client, générateurs séance/cycle, tokens de thème
src/components/portal/     Shell du portail coach (sidebar, header, hero, écrans interactifs)
src/components/admin/      Formulaires et listes de l'administration
src/app/(portal)/          Écrans du portail (routes protégées par session)
src/app/admin/             Panneau d'administration (routes protégées par rôle ADMIN)
src/app/api/                Route handlers (auth, créneaux, stages, présences, séances, cycles, admin)
```
