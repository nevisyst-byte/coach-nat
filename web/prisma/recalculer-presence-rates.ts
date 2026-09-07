// Rattrapage ponctuel : recalcule Nageur.presenceRate pour tous les
// nageurs déjà pointés, à lancer une fois après le déploiement du correctif
// (avant ça, ce champ ne se mettait jamais à jour automatiquement — voir
// lib/presence-rate.ts). Sans effet sur les nageurs jamais pointés.
//
// Usage : npx tsx prisma/recalculer-presence-rates.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { recalculerPresenceRate } from "../src/lib/presence-rate";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const noms = await prisma.presence.findMany({ where: { role: "SWIMMER" }, select: { nomPersonne: true }, distinct: ["nomPersonne"] });
  console.log(`${noms.length} nageur(s) avec un historique de présence à recalculer…`);
  for (const { nomPersonne } of noms) {
    await recalculerPresenceRate(nomPersonne);
    console.log(`  · ${nomPersonne}`);
  }
  console.log("Terminé.");
}

main().finally(() => prisma.$disconnect());
