import "dotenv/config";
import { PrismaClient, Pole, Nage, EtatEncadrement, EtatPresence, TypeCreneau, StatutStage, StatutAbsence, StatutConge } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "coachnat123";

const CRITERES = [
  "Départ / plongeon",
  "Coulée",
  "Amplitude",
  "Fréquence",
  "Coordination",
  "Respiration",
  "Virage",
  "Arrivée / touche",
];

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@coach-nat.fr" },
    update: {},
    create: { email: "admin@coach-nat.fr", passwordHash, name: "Administration COACH-NAT", role: "ADMIN" },
  });

  const coachDefs = [
    { email: "marie.lefort@coach-nat.fr", name: "Marie Lefort", initials: "ML" },
    { email: "thomas.girard@coach-nat.fr", name: "Thomas Girard", initials: "TG" },
    { email: "lea.morel@coach-nat.fr", name: "Léa Morel", initials: "LM" },
    { email: "paul.nadal@coach-nat.fr", name: "Paul Nadal", initials: "PN" },
  ];

  // ---- Saisons ----
  await prisma.inscription.deleteMany();
  await prisma.saison.deleteMany();
  await prisma.saison.create({ data: { label: "2025-2026", dateDebut: new Date("2025-09-01"), dateFin: new Date("2026-08-31"), active: false } });
  const saisonActive = await prisma.saison.create({ data: { label: "2026-2027", dateDebut: new Date("2026-09-01"), dateFin: new Date("2027-08-31"), active: true } });

  const coaches: Record<string, { id: string }> = {};
  for (const c of coachDefs) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { email: c.email, passwordHash, name: c.name, role: "COACH" },
    });
    const coach = await prisma.coach.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, initials: c.initials },
    });
    coaches[c.name] = coach;
  }

  // ---- Effectifs par pôle / catégorie ----
  const categories: { nom: string; pole: Pole; count: number }[] = [
    { nom: "EN1", pole: Pole.FORMATION, count: 38 },
    { nom: "EN2", pole: Pole.FORMATION, count: 41 },
    { nom: "EN3", pole: Pole.FORMATION, count: 34 },
    { nom: "Ado", pole: Pole.FORMATION, count: 27 },
    { nom: "Avenir", pole: Pole.COMPETITION, count: 24 },
    { nom: "Benjamin", pole: Pole.COMPETITION, count: 18 },
    { nom: "Élite", pole: Pole.COMPETITION, count: 9 },
    { nom: "Master compét.", pole: Pole.COMPETITION, count: 11 },
    { nom: "Sauv. natation", pole: Pole.SAUVETAGE, count: 22 },
    { nom: "Sauv. sportif", pole: Pole.SAUVETAGE, count: 16 },
    { nom: "Adultes", pole: Pole.LOISIR, count: 31 },
    { nom: "Découverte aqua.", pole: Pole.LOISIR, count: 29 },
    { nom: "Sport Handi", pole: Pole.LOISIR, count: 12 },
  ];
  await prisma.categorieEffectif.deleteMany();
  await prisma.categorieEffectif.createMany({ data: categories });

  // ---- Groupes ----
  type GroupeDef = { nom: string; pole: Pole; categorie: string; color: string; coach?: string; objectif?: string };
  const groupeDefs: GroupeDef[] = [
    { nom: "Compétition Élite", pole: Pole.COMPETITION, categorie: "Élite", color: "#E8442B", coach: "Marie Lefort", objectif: "Allure 200" },
    { nom: "Compétition Benjamin", pole: Pole.COMPETITION, categorie: "Benjamin", color: "#1E7BFF", coach: "Marie Lefort", objectif: "Seuil aérobie" },
    { nom: "Compétition Avenir", pole: Pole.COMPETITION, categorie: "Avenir", color: "#1E7BFF", coach: "Paul Nadal", objectif: "Technique 4 nages" },
    { nom: "Masters", pole: Pole.COMPETITION, categorie: "Master compét.", color: "#8C6BFF", coach: "Marie Lefort", objectif: "Technique brasse" },
    { nom: "École Natation 3", pole: Pole.FORMATION, categorie: "EN3", color: "#F2B33D", coach: "Thomas Girard", objectif: "Autonomie 4 nages" },
    { nom: "École Natation 1-2", pole: Pole.FORMATION, categorie: "EN1", color: "#F2B33D", coach: "Thomas Girard", objectif: "Mise en confiance" },
    { nom: "Ado", pole: Pole.FORMATION, categorie: "Ado", color: "#F2B33D", coach: "Thomas Girard", objectif: "Découverte compétition" },
    { nom: "Sauvetage sportif", pole: Pole.SAUVETAGE, categorie: "Sauv. sportif", color: "#2ECC8F", coach: "Léa Morel", objectif: "Épreuves fédérales" },
    { nom: "Adultes", pole: Pole.LOISIR, categorie: "Adultes", color: "#8C6BFF", coach: "Léa Morel", objectif: "Bien-être / endurance" },
    { nom: "Sport Handi", pole: Pole.LOISIR, categorie: "Sport Handi", color: "#8C6BFF", coach: "Léa Morel", objectif: "Adaptation individuelle" },
  ];

  await prisma.presence.deleteMany();
  await prisma.seanceInstance.deleteMany();
  await prisma.creneau.deleteMany();
  await prisma.creneauStage.deleteMany();
  await prisma.stageJour.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.notationTechnique.deleteMany();
  await prisma.performance.deleteMany();
  await prisma.nageur.deleteMany();
  await prisma.groupe.deleteMany();
  await prisma.conge.deleteMany();

  const groupes: Record<string, { id: string; nom: string; coachId: string | null }> = {};
  for (const g of groupeDefs) {
    const created = await prisma.groupe.create({
      data: {
        nom: g.nom,
        pole: g.pole,
        categorie: g.categorie,
        color: g.color,
        objectif: g.objectif,
        coachId: g.coach ? coaches[g.coach].id : null,
      },
    });
    groupes[g.nom] = created;
  }

  // ---- Nageurs ----
  type NageurDef = {
    nom: string; initiales: string; age: number; categorie: string; specialite: string;
    groupe: string; pointsFFN: number; rank: string; presence: number;
  };
  const nageurDefs: NageurDef[] = [
    { nom: "Sarah Blanc", initiales: "SB", age: 16, categorie: "Élite", specialite: "4 nages", groupe: "Compétition Élite", pointsFFN: 1024, rank: "1 / 3 / 42", presence: 94 },
    { nom: "Antoine Rey", initiales: "AR", age: 17, categorie: "Benjamin", specialite: "Nage libre", groupe: "Compétition Benjamin", pointsFFN: 968, rank: "2 / 7 / 118", presence: 58 },
    { nom: "Nathalie Cord", initiales: "NC", age: 15, categorie: "Avenir", specialite: "Dos", groupe: "Compétition Avenir", pointsFFN: 842, rank: "4 / 14 / 260", presence: 88 },
    { nom: "Léo Marchand", initiales: "LM", age: 14, categorie: "Avenir", specialite: "Brasse", groupe: "Compétition Avenir", pointsFFN: 790, rank: "6 / 21 / 391", presence: 91 },
    { nom: "Inès Fabre", initiales: "IF", age: 18, categorie: "Élite", specialite: "Papillon", groupe: "Compétition Élite", pointsFFN: 1002, rank: "1 / 4 / 61", presence: 96 },
    { nom: "Karim Dault", initiales: "KD", age: 34, categorie: "Master", specialite: "Nage libre", groupe: "Masters", pointsFFN: 712, rank: "3 / 9 / 154", presence: 72 },
    { nom: "Chloé Perrin", initiales: "CP", age: 12, categorie: "EN3", specialite: "Crawl", groupe: "École Natation 3", pointsFFN: 0, rank: "0 / 0 / 0", presence: 85 },
    { nom: "Tom Vasseur", initiales: "TV", age: 13, categorie: "Ado", specialite: "Découverte", groupe: "Ado", pointsFFN: 0, rank: "0 / 0 / 0", presence: 79 },
  ];

  const PERF_TEMPLATE = [
    { epreuve: "50 NL", temps: "26\"41", points: 962, niveau: "Régional", delta: "−0.42", rangNat: "118e" },
    { epreuve: "100 NL", temps: "57\"08", points: 988, niveau: "National", delta: "−0.91", rangNat: "74e" },
    { epreuve: "200 NL", temps: "2'04\"33", points: 1004, niveau: "National", delta: "−1.62", rangNat: "61e" },
    { epreuve: "100 Pap", temps: "1'03\"77", points: 901, niveau: "Régional", delta: "+0.24", rangNat: "204e" },
    { epreuve: "200 4N", temps: "2'19\"85", points: 944, niveau: "Régional", delta: "−2.10", rangNat: "132e" },
  ];

  const TECH_TEMPLATE: Record<Nage, number[]> = {
    [Nage.PAPILLON]: [3, 4, 3, 4, 3, 2, 3, 4],
    [Nage.DOS]: [4, 4, 4, 3, 4, 4, 3, 4],
    [Nage.BRASSE]: [3, 3, 4, 3, 3, 4, 4, 3],
    [Nage.CRAWL]: [5, 4, 5, 4, 5, 4, 4, 5],
  };

  const nageurs: Record<string, { id: string }> = {};
  for (const [i, n] of nageurDefs.entries()) {
    const [d, r, nat] = n.rank.split(" / ").map((x) => parseInt(x, 10) || null);
    const nageur = await prisma.nageur.create({
      data: {
        nom: n.nom,
        initiales: n.initiales,
        age: n.age,
        categorie: n.categorie,
        specialite: n.specialite,
        groupeId: groupes[n.groupe].id,
        pointsFFN: n.pointsFFN,
        rangDept: d,
        rangReg: r,
        rangNat: nat,
        presenceRate: n.presence,
      },
    });
    nageurs[n.nom] = nageur;

    await prisma.inscription.create({
      data: { nageurId: nageur.id, saisonId: saisonActive.id, groupeId: groupes[n.groupe].id, coachId: groupes[n.groupe].coachId },
    });

    // Performances (variation légère par nageur, seulement pour les groupes compétition)
    if (n.pointsFFN > 0) {
      const delta = (i - 2) * 6;
      await prisma.performance.createMany({
        data: PERF_TEMPLATE.map((p) => ({
          nageurId: nageur.id,
          epreuve: p.epreuve,
          temps: p.temps,
          points: Math.max(600, p.points + delta),
          niveau: p.niveau,
          deltaSaison: p.delta,
          rangNat: p.rangNat,
          saison: "2026-2027",
        })),
      });

      // Un point de comparaison la saison précédente, pour illustrer
      // l'onglet "Évolution" de la fiche nageur (temps légèrement moins bons).
      await prisma.performance.createMany({
        data: PERF_TEMPLATE.map((p) => ({
          nageurId: nageur.id,
          epreuve: p.epreuve,
          temps: p.temps,
          points: Math.max(500, p.points + delta - 40),
          niveau: p.niveau,
          deltaSaison: "—",
          rangNat: "—",
          saison: "2025-2026",
        })),
      });

      for (const nage of Object.values(Nage)) {
        const notes = TECH_TEMPLATE[nage];
        await prisma.notationTechnique.createMany({
          data: CRITERES.map((critere, ci) => ({
            nageurId: nageur.id,
            nage,
            critere,
            note: Math.min(5, Math.max(1, notes[ci] + (i % 2 === 0 ? 0 : -1))),
          })),
        });
      }
    }
  }

  // ---- Absences nageurs ----
  const absenceDefs: { nom: string; date: string; motif: string; statut: StatutAbsence }[] = [
    { nom: "Antoine Rey", date: "26 mai", motif: "Non déclarée", statut: StatutAbsence.A_TRAITER },
    { nom: "Antoine Rey", date: "19 mai", motif: "Épaule — reprise progressive", statut: StatutAbsence.BLESSURE },
    { nom: "Karim Dault", date: "02 juin", motif: "Déplacement pro", statut: StatutAbsence.VALIDEE },
    { nom: "Nathalie Cord", date: "03 juin", motif: "Maladie", statut: StatutAbsence.VALIDEE },
    { nom: "Tom Vasseur", date: "04 juin", motif: "Non déclarée", statut: StatutAbsence.A_TRAITER },
    { nom: "Léo Marchand", date: "05 juin", motif: "Scolaire", statut: StatutAbsence.VALIDEE },
  ];
  for (const a of absenceDefs) {
    await prisma.absence.create({
      data: { nageurId: nageurs[a.nom].id, date: a.date, motif: a.motif, statut: a.statut },
    });
  }

  // ---- Congés coachs ----
  await prisma.conge.createMany({
    data: [
      { coachId: coaches["Marie Lefort"].id, periodeLabel: "02 juin", motif: "Récupération", impact: "Remplacée par Thomas", statut: StatutConge.VALIDE },
      { coachId: coaches["Léa Morel"].id, periodeLabel: "22 → 26 juin", motif: "Congés annuels", impact: "5 créneaux à couvrir", statut: StatutConge.VALIDE },
      { coachId: coaches["Paul Nadal"].id, periodeLabel: "09 juillet", motif: "Formation MNS", impact: "2 créneaux à couvrir", statut: StatutConge.EN_ATTENTE },
    ],
  });

  // ---- Créneaux hebdomadaires réguliers ----
  type CreneauDef = { jour: number; debut: string; fin: string; groupe: string; coach?: string; libelleCoach?: string; bassin: string; effectif: string; etat: EtatEncadrement };
  const creneauDefs: CreneauDef[] = [
    { jour: 0, debut: "17:00", fin: "18:00", groupe: "École Natation 3", coach: "Thomas Girard", bassin: "Bassin 25 m", effectif: "12 nageurs", etat: EtatEncadrement.ASSURE },
    { jour: 0, debut: "18:00", fin: "20:00", groupe: "Compétition Benjamin", coach: "Marie Lefort", bassin: "Bassin 50 m", effectif: "14 nageurs", etat: EtatEncadrement.ASSURE },
    { jour: 1, debut: "20:00", fin: "21:30", groupe: "Masters", coach: "Marie Lefort", libelleCoach: "Marie Lefort (rempl.)", bassin: "Bassin 25 m", effectif: "9 nageurs", etat: EtatEncadrement.REMPLACE },
    { jour: 2, debut: "18:00", fin: "20:00", groupe: "Compétition Élite", coach: "Marie Lefort", bassin: "Bassin 50 m", effectif: "14 nageurs", etat: EtatEncadrement.ASSURE },
    { jour: 3, debut: "18:00", fin: "19:00", groupe: "Sauvetage sportif", coach: "Léa Morel", bassin: "Bassin 25 m", effectif: "8 nageurs", etat: EtatEncadrement.A_COUVRIR },
    { jour: 4, debut: "18:00", fin: "20:00", groupe: "Compétition Benjamin", coach: "Marie Lefort", bassin: "Bassin 50 m", effectif: "14 nageurs", etat: EtatEncadrement.ASSURE },
    { jour: 5, debut: "09:00", fin: "11:00", groupe: "École Natation 1-2", coach: "Thomas Girard", bassin: "Bassin 25 m", effectif: "16 nageurs", etat: EtatEncadrement.ASSURE },
  ];
  // ---- Historique de séances (8 dernières occurrences) + présence réelle ----
  // Alimente les graphiques de charge (coach) et d'assiduité (fiche nageur) avec
  // de vraies lignes datées plutôt que des exemples statiques.
  const VARIANTS_SEANCE = ["Nage complète", "Bras", "Jambes", "Éducatif"];
  const INTENSITES_SEANCE = ["Allure neutre", "Négatif split", "Progressif", "Allure 400", "Allure 200", "Vitesse"];
  const NAGES_SEANCE = ["4 nages", "Spécialité", "Papillon", "Dos", "Brasse", "Crawl"];
  const VOLUME_BASE: Record<string, number> = {
    "Compétition Élite": 4800, "Compétition Benjamin": 4000, "Compétition Avenir": 3200,
    "Masters": 2600, "École Natation 3": 1500, "École Natation 1-2": 1200,
    "Ado": 2000, "Sauvetage sportif": 2400,
  };
  const nageursParGroupe = new Map<string, string[]>();
  for (const n of nageurDefs) nageursParGroupe.set(n.groupe, [...(nageursParGroupe.get(n.groupe) ?? []), n.nom]);

  function lastOccurrence(jour: number, weeksAgo: number) {
    const d = new Date();
    const refJour = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - ((refJour - jour + 7) % 7) - weeksAgo * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  for (const c of creneauDefs) {
    const creneau = await prisma.creneau.create({
      data: {
        jour: c.jour,
        debut: c.debut,
        fin: c.fin,
        groupeId: groupes[c.groupe].id,
        coachId: c.coach ? coaches[c.coach].id : null,
        libelleCoach: c.libelleCoach,
        bassin: c.bassin,
        effectifLabel: c.effectif,
        etat: c.etat,
      },
    });

    const base = VOLUME_BASE[c.groupe] ?? 2500;
    const roster = nageursParGroupe.get(c.groupe) ?? [];
    for (let w = 1; w <= 8; w++) {
      const date = lastOccurrence(c.jour, w);
      const variant = VARIANTS_SEANCE[(w + c.jour) % VARIANTS_SEANCE.length];
      const intensite = INTENSITES_SEANCE[(w * 2 + c.jour) % INTENSITES_SEANCE.length];
      const nage = NAGES_SEANCE[(w + c.jour * 2) % NAGES_SEANCE.length];
      const volumeNage = Math.round((base + (((w * 37 + c.jour * 13) % 9) - 4) * 100) / 50) * 50;

      const instance = await prisma.seanceInstance.create({
        data: { creneauId: creneau.id, date, groupeNom: c.groupe, coachId: c.coach ? coaches[c.coach].id : null, variant, intensite, nage, volumeNage },
      });

      if (roster.length > 0) {
        await prisma.presence.createMany({
          data: roster.map((nom) => {
            const rate = nageurDefs.find((n) => n.nom === nom)?.presence ?? 85;
            const roll = (w * 53 + nom.length * 7 + c.jour * 17) % 100;
            const etat: EtatPresence = roll < rate ? EtatPresence.PRESENT : roll < rate + 10 ? EtatPresence.RETARD : roll < rate + 18 ? EtatPresence.EXCUSE : EtatPresence.ABSENT;
            return { seanceInstanceId: instance.id, nomPersonne: nom, role: "SWIMMER", etat };
          }),
        });
      }
    }
  }

  // ---- Stages ----
  type StageDef = {
    nom: string; periodeLabel: string; dateDebut: Date; dateFin: Date; lieu: string; groupesLabel: string; coachsLabel: string;
    statut: StatutStage; color: string; inscrits: number; places: number; budgetLabel: string; regleLabel: string;
    dates: string[];
    creneaux: { jour: number; debut: string; fin: string; type: TypeCreneau; groupe: string; coach?: string; bassin: string; theme: string; volume: number }[];
  };
  const stageDefs: StageDef[] = [
    {
      nom: "Stage Toussaint · Élite", periodeLabel: "19 → 24 oct. 2026",
      dateDebut: new Date(2026, 9, 19), dateFin: new Date(2026, 9, 24), lieu: "CREPS Font-Romeu",
      groupesLabel: "Élite · Benjamin", coachsLabel: "Marie Lefort, Paul Nadal", statut: StatutStage.CONFIRME, color: "#E8442B",
      inscrits: 19, places: 22, budgetLabel: "8 400 €", regleLabel: "85%",
      dates: ["19 oct.", "20 oct.", "21 oct.", "22 oct.", "23 oct.", "24 oct.", ""],
      creneaux: [
        { jour: 0, debut: "07:00", fin: "09:00", type: TypeCreneau.EAU, groupe: "Élite", coach: "Marie Lefort", bassin: "Bassin 50 m", theme: "Volume aérobie", volume: 5000 },
        { jour: 0, debut: "10:00", fin: "11:00", type: TypeCreneau.PHYSIQUE, groupe: "Élite", coach: "Paul Nadal", bassin: "Salle", theme: "Technique", volume: 0 },
        { jour: 0, debut: "17:00", fin: "19:00", type: TypeCreneau.EAU, groupe: "Benjamin", coach: "Paul Nadal", bassin: "Bassin 50 m", theme: "Seuil", volume: 4000 },
        { jour: 1, debut: "07:00", fin: "09:00", type: TypeCreneau.EAU, groupe: "Tous groupes", coach: "Marie Lefort", bassin: "Bassin 50 m", theme: "VMA", volume: 4500 },
        { jour: 1, debut: "17:00", fin: "18:30", type: TypeCreneau.EAU, groupe: "Élite", coach: "Marie Lefort", bassin: "Bassin 25 m", theme: "Technique", volume: 3000 },
        { jour: 2, debut: "09:00", fin: "11:00", type: TypeCreneau.EAU, groupe: "Tous groupes", coach: "Paul Nadal", bassin: "Bassin 50 m", theme: "Lactique", volume: 3500 },
        { jour: 2, debut: "15:00", fin: "16:00", type: TypeCreneau.VIDEO, groupe: "Élite", coach: "Marie Lefort", bassin: "Salle vidéo", theme: "Technique", volume: 0 },
        { jour: 3, debut: "07:00", fin: "09:00", type: TypeCreneau.EAU, groupe: "Élite", coach: "Marie Lefort", bassin: "Bassin 50 m", theme: "Volume aérobie", volume: 5000 },
        { jour: 3, debut: "17:00", fin: "19:00", type: TypeCreneau.EAU, groupe: "Benjamin", coach: "Paul Nadal", bassin: "Bassin 50 m", theme: "Seuil", volume: 4000 },
        { jour: 4, debut: "08:00", fin: "09:30", type: TypeCreneau.RECUP, groupe: "Tous groupes", coach: "Paul Nadal", bassin: "Bassin 25 m", theme: "Récupération", volume: 1500 },
        { jour: 4, debut: "17:00", fin: "19:00", type: TypeCreneau.EAU, groupe: "Tous groupes", coach: "Marie Lefort", bassin: "Bassin 50 m", theme: "Vitesse", volume: 3000 },
        { jour: 5, debut: "09:00", fin: "11:00", type: TypeCreneau.EAU, groupe: "Tous groupes", coach: "Marie Lefort", bassin: "Bassin 50 m", theme: "Vitesse", volume: 3500 },
      ],
    },
    {
      nom: "Stage Noël · Avenir", periodeLabel: "28 → 30 déc. 2026",
      dateDebut: new Date(2026, 11, 28), dateFin: new Date(2026, 11, 30), lieu: "Piscine olympique — sur place",
      groupesLabel: "Avenir", coachsLabel: "Thomas Girard", statut: StatutStage.OUVERT, color: "#1E7BFF",
      inscrits: 16, places: 24, budgetLabel: "2 100 €", regleLabel: "40%",
      dates: ["28 déc.", "29 déc.", "30 déc.", "", "", "", ""],
      creneaux: [
        { jour: 0, debut: "10:00", fin: "12:00", type: TypeCreneau.EAU, groupe: "Avenir", coach: "Thomas Girard", bassin: "Bassin 50 m", theme: "Technique", volume: 3000 },
        { jour: 0, debut: "14:00", fin: "15:00", type: TypeCreneau.PHYSIQUE, groupe: "Avenir", coach: "Thomas Girard", bassin: "Salle", theme: "Technique", volume: 0 },
        { jour: 1, debut: "10:00", fin: "12:00", type: TypeCreneau.EAU, groupe: "Avenir", coach: "Thomas Girard", bassin: "Bassin 50 m", theme: "Volume aérobie", volume: 3500 },
        { jour: 2, debut: "10:00", fin: "12:00", type: TypeCreneau.EAU, groupe: "Avenir", coach: "Thomas Girard", bassin: "Bassin 50 m", theme: "Vitesse", volume: 2500 },
      ],
    },
    {
      nom: "Stage Février · Masters", periodeLabel: "14 → 17 févr. 2027",
      dateDebut: new Date(2027, 1, 14), dateFin: new Date(2027, 1, 17), lieu: "Antibes",
      groupesLabel: "Master compét.", coachsLabel: "Marie Lefort", statut: StatutStage.EN_PREPARATION, color: "#8C6BFF",
      inscrits: 7, places: 14, budgetLabel: "3 600 €", regleLabel: "0%",
      dates: ["14 févr.", "15 févr.", "16 févr.", "17 févr.", "", "", ""],
      creneaux: [
        { jour: 0, debut: "09:00", fin: "11:00", type: TypeCreneau.EAU, groupe: "Masters", coach: "Marie Lefort", bassin: "Bassin 50 m", theme: "Volume aérobie", volume: 3000 },
        { jour: 1, debut: "09:00", fin: "11:00", type: TypeCreneau.EAU, groupe: "Masters", coach: "Marie Lefort", bassin: "Bassin 50 m", theme: "Seuil", volume: 3000 },
        { jour: 2, debut: "09:00", fin: "10:30", type: TypeCreneau.RECUP, groupe: "Masters", coach: "Marie Lefort", bassin: "Bassin 25 m", theme: "Récupération", volume: 1500 },
      ],
    },
  ];

  for (const s of stageDefs) {
    const stage = await prisma.stage.create({
      data: {
        nom: s.nom, periodeLabel: s.periodeLabel, dateDebut: s.dateDebut, dateFin: s.dateFin, lieu: s.lieu, groupesLabel: s.groupesLabel,
        coachsLabel: s.coachsLabel, statut: s.statut, color: s.color, inscrits: s.inscrits,
        places: s.places, budgetLabel: s.budgetLabel, regleLabel: s.regleLabel,
      },
    });
    await prisma.stageJour.createMany({
      data: s.dates.map((dateLabel, jour) => {
        const date = new Date(s.dateDebut);
        date.setDate(date.getDate() + jour);
        return { stageId: stage.id, jour, dateLabel, date: dateLabel ? date : null };
      }),
    });
    await prisma.creneauStage.createMany({
      data: s.creneaux.map((c) => ({
        stageId: stage.id, jour: c.jour, debut: c.debut, fin: c.fin, type: c.type,
        groupe: c.groupe, coachId: c.coach ? coaches[c.coach].id : null, bassin: c.bassin,
        theme: c.theme, volume: c.volume,
      })),
    });
  }

  // ---- Échéances de la saison ----
  await prisma.echeance.deleteMany();
  const currentYear = new Date().getFullYear();
  await prisma.echeance.createMany({
    data: [
      { date: new Date(currentYear, 5, 13), titre: "Interclubs régionaux", detail: "Élite + Benjamin · bassin 50 m", color: "#E8442B" },
      { date: new Date(currentYear, 5, 22), titre: "Congés Léa Morel", detail: "5 créneaux Sauvetage à couvrir", color: "#2ECC8F" },
      { date: new Date(currentYear, 5, 28), titre: "Tests de cotation FFN", detail: "Tous groupes compétition", color: "#1E7BFF" },
      { date: new Date(currentYear, 6, 5), titre: "Championnats départementaux", detail: "Avenir · Benjamin · Élite", color: "#F2B33D" },
    ],
  });

  // ---- Réglages du club ----
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", zoneScolaire: "B" },
  });

  console.log("Seed terminé.");
  console.log(`Admin: admin@coach-nat.fr / ${DEFAULT_PASSWORD}`);
  for (const c of coachDefs) console.log(`Coach: ${c.email} / ${DEFAULT_PASSWORD}`);
  console.log(`(id admin user: ${adminUser.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
