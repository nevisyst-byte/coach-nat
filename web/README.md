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

- Tableaux de bord général et coach
- Planning global / mon planning (créneaux hebdomadaires récurrents, création/suppression)
- Stages (planning de la semaine par stage, créneaux multiples/jour, création de stage)
- Présences (pointage nageurs/encadrement par séance)
- Calendrier (mois en cours + échéances de saison)
- Nageurs (liste filtrable + fiche : cotation FFN, notation technique par nage,
  modale de notation persistée)
- Absences & congés
- Créateur de séance (génération de séance à partir de variant/intensité/nage/volume)
- Thématiques d'entraînement (génération de cycle + 3 graphiques)
- **Administration** (`/admin`, réservé au rôle `ADMIN`) : comptes, groupes,
  nageurs, effectifs par catégorie, échéances de saison

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

## Simplifications restantes

- **Créneaux récurrents sans exception** : un `Creneau` reste un horaire hebdomadaire
  fixe — il n'y a pas encore de mécanisme pour annuler ou déplacer une seule occurrence
  sans toucher aux suivantes.
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
