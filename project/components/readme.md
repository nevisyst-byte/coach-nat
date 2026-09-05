# Composants

Inventaire dérivé du portail COACH-NAT — rien de plus que ce que les écrans
utilisent réellement.

| Groupe | Composant | Rôle |
| --- | --- | --- |
| core | `Button` | action ; un seul `primary` par écran |
| core | `Chip` | choix exclusif ou multiple (variant, intensité, nage, filtre) |
| core | `Badge` | état figé, non cliquable |
| data | `StatCard` | indicateur chiffré d'en-tête |
| data | `MeterBar` | proportion comparée |
| data | `Donut` | répartition d'un volume + légende chiffrée |
| data | `RatingScale` | notation technique 1→5, cibles 44 px |
| patterns | `SectionCard` | carte de section titrée — seul niveau de carte |
| patterns | `SlotCard` | créneau de planning (état → groupe → coach → faits) |
| patterns | `PersonRow` | ligne de personne (pointage, absences, encadrement) |
| patterns | `EmptyState` | absence de données, avec sortie proposée |

Chaque composant s'appuie exclusivement sur les variables CSS de `tokens/` :
aucun style codé en dur, aucune dépendance npm.
