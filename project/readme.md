# COACH-NAT — Design System

Système de design du **portail coachs de natation COACH-NAT**, dérivé du portail
construit dans ce même projet. Il n'existait aucun design system préalable : les
fondations ci-dessous ont été extraites des écrans réels, puis normalisées.

## Sources

| Source | Nature | État |
| --- | --- | --- |
| `uploads/COACH natation.docx` | Notes de cadrage du club + captures d'une application existante (thème crème/or, abandonné) | lu |
| `uploads/image-3852b771-2409-4709-9372-32ca6d780c7b.png` | **Logo officiel COACH FT** fourni par le club (écusson + nageur papillon + bandeau, bleu / orange, tricolore) | recadré en `assets/logo-lockup.png` (lockup) et `assets/logo-crest.png` (écusson) |
| `Portail COACH-NAT.dc.html` | Portail desktop, 12 écrans — **référence visuelle de ce système** | dans ce projet |
| `Portail COACH-NAT Mobile.dc.html` | Version mobile, 5 onglets | dans ce projet |
| `Propositions couleur.dc.html` | 4 directions couleur explorées ; c'est **1a (bleu / rouge)** qui a été retenue | dans ce projet |

Aucun dépôt de code ni fichier Figma n'a été fourni. Aucun projet de design system
n'était accessible en écriture : ce système vit donc dans le projet du portail.

## Index

- `styles.css` — point d'entrée unique, ne contient que des `@import`
- `tokens/` — `fonts`, `colors`, `typography`, `spacing`, `shape`
- `components/core/` — Button, Chip, Badge
- `components/data/` — StatCard, MeterBar, Donut, RatingScale
- `components/patterns/` — SectionCard, SlotCard, PersonRow, EmptyState
- `guidelines/` — 11 cartes specimens (Colors, Type, Spacing, Brand)
- `assets/` — logo du club + deux photographies de marque

## Fondations visuelles

**Palette.** Un fond marine profond (`--bg-base` #080D18) et six niveaux de
surface qui montent vers le clair sans jamais quitter le bleu. Le **bleu #1E7BFF**
du logo porte l'action, le **rouge #E8442B** du logo porte la rupture (notation,
suppression, alerte, élite). Le cyan #24C8FF est réservé aux états actifs et au
focus. Aucune couleur n'est décorative : vert / ambre / rouge encodent
assuré / remplacé / à couvrir, et les cinq couleurs de filière
(aérobie, seuil, VMA, lactique, vitesse) sont fixes d'un écran à l'autre.

**Typographie.** Deux familles seulement. *Barlow Condensed* en 700 majuscules
pour tous les titres et **tous les chiffres** — un indicateur se lit avant son
libellé. *Barlow* pour le texte courant, de 15 à 11 px. Les étiquettes sont
toujours en capitales avec un interlettrage de 0,12 à 0,18 em ; les titres de
section à 0,06 em. Le corps de texte descend à 12 px, jamais en dessous.

**Fonds.** Cinq photographies générées via Artlist — texture d'eau nocturne,
nageur en papillon, coach au bord du bassin, bassin olympique vu de haut,
virage sous l'eau — attribuées par écran (`assets/`) :

| Écran | Photo |
| --- | --- |
| Tableau de bord général, Nageurs | `swimmer.jpg` |
| Tableau de bord coach, Présences, Absences | `coach-poolside.jpg` |
| Plannings, Stages, Calendrier | `pool-lanes.jpg` |
| Fiche nageur, Créateur de séance, Thématiques | `flip-turn.jpg` |
| Barres et en-têtes (texture) | `water-texture.jpg` |

Toutes sont posées toujours posées **sous un voile** en dégradé : `--photo-veil-hero` pour
le bandeau d'accueil, `--photo-veil-card` pour les en-têtes de fiche,
`--photo-veil-bar` pour les barres. Règle absolue : le texte reste dans la zone
où le voile est à ≥ 0,8 d'opacité, et l'encre passe à `--ink-on-photo` (#D6E2F2).
Jamais de dégradé violacé, jamais de photo en pleine opacité derrière du texte.

**Cartes.** Un seul niveau : fond `--bg-card`, bordure `--border` (blanc à 9 %),
rayon 16 px, padding 20 px. Pas d'ombre portée sur les cartes — l'ombre est
réservée aux surfaces flottantes (modale, menu de recherche). Le liseré coloré de
4 px à gauche n'apparaît que lorsqu'il **encode un état** (créneau, stage,
notation par nage) — jamais comme ornement.

**Animation et états.** Transitions de 0,14 s sur couleur de fond, bordure, encre
et filtre — rien d'autre ne s'anime. Survol : voile blanc plus clair
(0,03 → 0,07). Pression : `translateY(1px)`. Focus clavier : anneau cyan de 2 px
avec 2 px d'offset. Aucun rebond, aucune apparition différée.

**Layout.** Barre latérale de 252 px, repliable en **rail d'icônes de 78 px** —
jamais escamotée à zéro. En-tête collant avec flou de 12 px. Grilles en
`repeat(auto-fit, minmax(340px, 1fr))` et `gap: 18px` ; plannings en 7 colonnes de
186 px minimum avec défilement horizontal. Cibles tactiles : 40 px sur desktop,
**44 px plancher sur mobile**.

## Fondations de contenu

Vouvoiement absent : le portail parle au coach en **tutoiement implicite**, par
phrases nominales courtes. Les libellés sont des termes de métier français, non
traduits et non abrégés arbitrairement : « créneau », « filière », « cotation FFN »,
« variant », « allure 200 », « affûtage », « négatif split ». Casse phrase partout
sauf dans les titres display et les étiquettes, en capitales.

Les chiffres sont formatés à la française : espace pour les milliers (« 1 024 pts »),
virgule décimale (« 15,8 km »), temps de nage en `2'04"33`, gains en `−1.62`
avec le vrai signe moins. Les états sont nommés, pas codés : « À couvrir » plutôt
que « KO ». Aucun emoji, nulle part.

Les messages d'état vide donnent toujours une sortie : « Essaie un autre nom, ou
retire le filtre de groupe » + bouton de réinitialisation.

## Iconographie

Le portail n'utilise **aucune bibliothèque d'icônes** : les glyphes sont des
caractères Unicode géométriques rendus dans Barlow, à 15 px, opacité 0,9 —
`◈ ◉ ▦ ▤ ▣ ⛭ ✓ ⚑ ☰ ✦ ⟳ ✈ ⌕ ＋ ✕ ‹ › ▸ ▾ ⚠ ▼ ✎ ◷`. Ce choix est délibéré :
un seul fichier de police pour tout le portail, aucune dépendance CDN, et un
rendu homogène avec la typographie. Les seules images sont le logo du club et les
deux photographies de marque. **Aucun emoji.** Si un jeu d'icônes vectorielles
devient nécessaire, prendre Lucide (trait 1,5 px) — c'est le plus proche de la
sobriété actuelle — et le documenter ici.

## Additions volontaires

Le portail étant la seule source, l'inventaire de composants est exactement ce
qu'il contient. Deux ajouts n'existent pas comme composant isolé dans le portail
mais y sont répétés à l'identique et méritaient d'être normalisés :

- **EmptyState** — présent sur la recherche de nageurs et les jours de planning vides.
- **SectionCard** — le motif de carte titrée, répété une trentaine de fois.

## Réserves

- **Logo** : le club a fourni un PNG sur fond sombre (`assets/logo-lockup.png`,
  `assets/logo-crest.png`). Il n'existe pas de version vectorielle ni détourée :
  le lockup ne peut donc être posé que sur un fond sombre. Pour un usage clair
  (impression, fond blanc), demander un **SVG ou un PNG à fond transparent**.
- **Polices** : aucun fichier fourni par le club. Barlow / Barlow Condensed sont
  servis par Google Fonts — substitution à valider.
- **Cartes de composants** : les specimens sont écrits en HTML + tokens plutôt que
  montés depuis le bundle React, car ce projet n'est pas compilé comme design
  system. Si le système est déplacé dans un projet dédié, remplacer le markup des
  cartes par un montage `window.<Namespace>`.
- Les données de tous les écrans sont **fictives**.
