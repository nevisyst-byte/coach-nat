-- Fusionne PhaseObjectif (badge macro seul) dans PlanEntrainement (qui
-- porte déjà le contenu chiffré) : chaque PhaseObjectif existante devient un
-- PlanEntrainement sans détail chiffré, avec le même thème/période/groupe —
-- rien n'est perdu, `theme` remplace le rôle joué par PhaseObjectif.theme.

-- AlterTable : sections déjà optionnel n'est plus une contrainte, theme
-- ajouté nullable pour permettre le backfill avant de le rendre obligatoire.
ALTER TABLE "PlanEntrainement" ADD COLUMN "theme" TEXT,
ALTER COLUMN "sections" DROP NOT NULL;

ALTER TABLE "SeanceInstance" ADD COLUMN "heureDebut" TEXT,
ADD COLUMN "sections" JSONB;

-- Backfill des PlanEntrainement déjà existants (créés avant l'ajout de
-- `theme`) : aucun thème macro connu, on les marque explicitement plutôt que
-- de deviner.
UPDATE "PlanEntrainement" SET "theme" = 'Plan personnalisé' WHERE "theme" IS NULL;

-- Migration des données : une PhaseObjectif devient un PlanEntrainement
-- macro (sans sections) lié à son groupe via la table de jointure.
INSERT INTO "PlanEntrainement" ("id", "nom", "theme", "heureDebut", "sections", "dateDebut", "dateFin", "createdAt")
SELECT "id", "theme", "theme", NULL, NULL, "dateDebut", "dateFin", "createdAt" FROM "PhaseObjectif";

INSERT INTO "_PlanEntrainementGroupes" ("A", "B")
SELECT "groupeId", "id" FROM "PhaseObjectif";

ALTER TABLE "PlanEntrainement" ALTER COLUMN "theme" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "PhaseObjectif" DROP CONSTRAINT "PhaseObjectif_groupeId_fkey";

-- DropTable
DROP TABLE "PhaseObjectif";

-- CreateIndex
CREATE INDEX "PlanEntrainement_dateDebut_idx" ON "PlanEntrainement"("dateDebut");
