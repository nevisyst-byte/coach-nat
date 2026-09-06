-- CreateTable
CREATE TABLE "CreneauNageur" (
    "id" TEXT NOT NULL,
    "creneauId" TEXT NOT NULL,
    "nageurId" TEXT NOT NULL,

    CONSTRAINT "CreneauNageur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreneauNageur_creneauId_nageurId_key" ON "CreneauNageur"("creneauId", "nageurId");

-- AddForeignKey
ALTER TABLE "CreneauNageur" ADD CONSTRAINT "CreneauNageur_creneauId_fkey" FOREIGN KEY ("creneauId") REFERENCES "Creneau"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreneauNageur" ADD CONSTRAINT "CreneauNageur_nageurId_fkey" FOREIGN KEY ("nageurId") REFERENCES "Nageur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
