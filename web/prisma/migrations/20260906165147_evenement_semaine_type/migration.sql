-- CreateEnum
CREATE TYPE "CategorieEvenement" AS ENUM ('REUNION', 'FORUM', 'AUTRE');

-- CreateTable
CREATE TABLE "EvenementSemaine" (
    "id" TEXT NOT NULL,
    "jour" INTEGER NOT NULL,
    "debut" TEXT NOT NULL,
    "fin" TEXT NOT NULL,
    "categorie" "CategorieEvenement" NOT NULL DEFAULT 'AUTRE',
    "titre" TEXT NOT NULL,
    "lieu" TEXT,
    "coachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvenementSemaine_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EvenementSemaine" ADD CONSTRAINT "EvenementSemaine_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
