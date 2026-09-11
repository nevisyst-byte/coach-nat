-- AlterTable
ALTER TABLE "PlanEntrainement" ADD COLUMN     "combos" JSONB;

-- CreateTable
CREATE TABLE "ModeleSeance" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "heureDebut" TEXT,
    "combos" JSONB,
    "volumeNage" INTEGER,
    "sections" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModeleSeance_pkey" PRIMARY KEY ("id")
);
