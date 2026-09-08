// Rattrapage ponctuel : recalcule Nageur.presenceRate pour tous les
// nageurs déjà pointés, à lancer une fois après le déploiement du correctif
// (avant ça, ce champ ne se mettait jamais à jour automatiquement — voir
// lib/presence-rate.ts). Sans effet sur les nageurs jamais pointés.
//
// Calcule par nageurId (lien stable) plutôt que par nom : les présences pas
// encore liées (nageurId NULL, saisies avant l'ajout de ce lien) sont quand
// même comptées si leur nomPersonne correspond encore au nom actuel du
// nageur — sinon (nageur renommé depuis), elles restent orphelines comme
// avant, sans effet sur ce recalcul.
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

async function recalculerPresenceRate(nageurId: string, nomPersonne: string) {
  const presences = await prisma.presence.findMany({
    where: { role: "SWIMMER", OR: [{ nageurId }, { nageurId: null, nomPersonne }] },
    select: { etat: true },
  });
  if (presences.length === 0) return null;
  const favorable = presences.filter((p) => p.etat === "PRESENT" || p.etat === "RETARD").length;
  const presenceRate = Math.round((favorable / presences.length) * 100);
  await prisma.nageur.update({ where: { id: nageurId }, data: { presenceRate } });
  return presenceRate;
}

async function main() {
  const nageurs = await prisma.nageur.findMany({ select: { id: true, nom: true } });
  console.log(`${nageurs.length} nageur(s) à recalculer…`);
  let touches = 0;
  for (const { id, nom } of nageurs) {
    const taux = await recalculerPresenceRate(id, nom);
    if (taux !== null) {
      console.log(`  · ${nom} → ${taux}%`);
      touches++;
    }
  }
  console.log(`Terminé. ${touches} nageur(s) avec un historique de présence recalculé(s).`);
}

main().finally(() => prisma.$disconnect());
