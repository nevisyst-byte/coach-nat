-- AlterTable
ALTER TABLE "Presence" ADD COLUMN     "nageurId" TEXT;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_nageurId_fkey" FOREIGN KEY ("nageurId") REFERENCES "Nageur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rattrapage : relie les présences déjà enregistrées au nageur correspondant
-- quand nomPersonne correspond encore exactement au nom actuel. Les lignes
-- dont le nageur a été renommé depuis resteront non liées (nageurId NULL) et
-- continueront à être ignorées par le calcul de presenceRate, comme avant
-- cette migration — cette mise à jour ne fait qu'ajouter de la robustesse,
-- jamais régresser un cas qui fonctionnait déjà.
UPDATE "Presence" p
SET "nageurId" = n.id
FROM "Nageur" n
WHERE p."role" = 'SWIMMER' AND p."nomPersonne" = n.nom AND p."nageurId" IS NULL;
