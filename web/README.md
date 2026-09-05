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

## Simplifications assumées

Le prototype Claude Design contenait des données et interactions fictives qui ne
correspondent à aucune table réelle. Pour livrer un vrai backend sans sur-ingénierie,
quelques écarts assumés :

- **Créneaux récurrents** : un `Creneau` représente un horaire hebdomadaire récurrent
  (pas un événement daté). La navigation "semaine" du planning affiche donc les vraies
  dates de la semaine choisie, mais le contenu (les créneaux) reste identique d'une
  semaine à l'autre — il n'y a pas encore de notion d'exception ponctuelle.
- **Présence par créneau, pas par date** : les pointages sont rattachés à un créneau
  (`contextKey`), pas à une occurrence datée précise. Un vrai suivi historique séance
  par séance demanderait un modèle `SeanceInstance` (créneau × date) non implémenté ici.
- **Répartition de charge (coach, nage/intensité/variant)** : ces graphiques utilisent
  des volumes d'exemple (comme dans le prototype) plutôt qu'un vrai journal d'entraînement
  nagé, qui n'existe pas encore comme table. Le seed ne modélise que 8 nageurs (comme le
  prototype), alors que les effectifs par pôle affichent des totaux club réalistes
  (312 licenciés) issus de `CategorieEffectif`, éditables dans l'admin.
- **Podium** : le prototype affichait un "podium des progressions" basé sur un delta de
  temps fictif non stocké. Faute d'historique de performance daté, l'écran général
  affiche à la place un podium des meilleurs points FFN actuels.
- **Assiduité par nageur** : le graphique hebdomadaire fictif du prototype a été remplacé
  par le taux de présence réel du nageur (`presenceRate`) + la liste réelle des absences,
  plutôt que d'inventer un historique semaine par semaine.

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
