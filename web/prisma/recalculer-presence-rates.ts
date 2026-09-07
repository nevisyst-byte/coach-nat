// Rattrapage ponctuel : recalcule Nageur.presenceRate pour tous les
// nageurs déjà pointés, à lancer une fois après le déploiement du correctif
// (avant ça, ce champ ne se mettait jamais à jour automatiquement — voir
// lib/presence-rate.ts). Sans effet sur les nageurs jamais pointés.
//
// Volontairement autonome (ne dépend que de src/generated, comme seed.ts) :
// l'image Docker de prod ne copie que src/generated, pas tout src/, donc un
// import de src/lib/presence-rate échouerait dans le conteneur.
//
// Usage : npx tsx prisma/recalculer-presence-rates.ts
// En prod (conteneur) : docker compose --env-file .env.production exec app
//   node node_modules/tsx/dist/cli.mjs prisma/recalculer-presence-rates.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function recalculerPresenceRate(nomPersonne: string) {
  const presences = await prisma.presence.findMany({ where: { nomPersonne, role: "SWIMMER" }, select: { etat: true } });
  if (presences.length === 0) return;
  const favorable = presences.filter((p) => p.etat === "PRESENT" || p.etat === "RETARD").length;
  const presenceRate = Math.round((favorable / presences.length) * 100);
  await prisma.nageur.updateMany({ where: { nom: nomPersonne }, data: { presenceRate } });
}

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
