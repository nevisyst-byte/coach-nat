-- AlterTable
ALTER TABLE "Creneau" ADD COLUMN     "actifHorsVacances" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Stage" ADD COLUMN     "dateDebut" TIMESTAMP(3),
ADD COLUMN     "dateFin" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StageJour" ADD COLUMN     "date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "zoneScolaire" TEXT NOT NULL DEFAULT 'B',

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
