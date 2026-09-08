import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FicheNageur } from "@/components/portal/FicheNageur";
import { CRITERES, isoWeekNumber, mondayOfWeek } from "@/lib/format";
import { getActiveSaison } from "@/lib/saison";

const NAGE_COLOR: Record<string, string> = { PAPILLON: "#E8442B", DOS: "#24C8FF", BRASSE: "#F2B33D", CRAWL: "#1E7BFF" };
const NAGES = ["PAPILLON", "DOS", "BRASSE", "CRAWL"];

export default async function FichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const nageur = await prisma.nageur.findUnique({
    where: { id },
    include: {
      groupe: true,
      performances: { orderBy: { points: "desc" } },
      absences: { orderBy: { id: "desc" } },
      notations: { orderBy: { date: "desc" } },
      inscriptions: { include: { saison: true, groupe: true, coach: { include: { user: true } } }, orderBy: { saison: { dateDebut: "desc" } } },
    },
  });

  if (!nageur) notFound();

  const saisonActive = await getActiveSaison();

  const since8 = new Date();
  since8.setDate(since8.getDate() - 56);
  const presenceRows = await prisma.presence.findMany({
    where: { nomPersonne: nageur.nom, seanceInstance: { date: { gte: since8 } } },
    include: { seanceInstance: true },
  });

  const weekBuckets = new Map<string, { present: number; total: number; date: Date }>();
  for (const p of presenceRows) {
    const monday = mondayOfWeek(p.seanceInstance.date);
    const key = monday.toISOString();
    const bucket = weekBuckets.get(key) ?? { present: 0, total: 0, date: monday };
    bucket.total += 1;
    if (p.etat === "PRESENT" || p.etat === "RETARD") bucket.present += 1;
    weekBuckets.set(key, bucket);
  }
  const assiduite = Array.from(weekBuckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => {
      const pct = Math.round((b.present / b.total) * 100);
      return { sem: `S${isoWeekNumber(b.date)}`, pct, color: pct >= 80 ? "#2ECC8F" : pct >= 65 ? "#F2B33D" : "#E8442B" };
    });

  const technique = NAGES.map((nage) => {
    const rows = nageur.notations.filter((n) => n.nage === nage);
    const latestByCritere = new Map<string, number>();
    for (const r of rows) if (!latestByCritere.has(r.critere)) latestByCritere.set(r.critere, r.note);
    const criteres = CRITERES.map((nom) => ({ nom, note: latestByCritere.get(nom) ?? 0 }));
    const noted = criteres.filter((c) => c.note > 0);
    const moyenne = noted.length ? noted.reduce((a, c) => a + c.note, 0) / noted.length : 0;
    return { nage, color: NAGE_COLOR[nage], moyenne, criteres };
  });

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/nageurs"
        className="self-start rounded-[9px] px-3.5 py-2 text-[13px]"
        style={{ border: "1px solid var(--border-strong)", color: "var(--ink-body)" }}
      >
        ← Tous les nageurs
      </Link>

      <div
        className="rounded-2xl p-5 flex gap-5 items-center flex-wrap"
        style={{
          backgroundImage: "linear-gradient(110deg,rgba(12,21,36,0.95) 0%,rgba(12,21,36,0.7) 50%,rgba(18,41,75,0.45) 100%), url('/assets/water-texture.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          border: "1px solid var(--border-strong)",
        }}
      >
        <div
          className="w-[66px] h-[66px] rounded-2xl flex items-center justify-center font-display text-[26px]"
          style={{ background: "linear-gradient(135deg,#1E7BFF,#E8442B)" }}
        >
          {nageur.initiales}
        </div>
        <div className="flex-1" style={{ minWidth: 200 }}>
          <h2 className="font-display text-[32px] leading-none">{nageur.nom}</h2>
          <div className="text-[13px] mt-1.5" style={{ color: "var(--ink-body)" }}>
            {nageur.age} ans · {nageur.categorie} · {nageur.groupe?.nom ?? "—"}
            {nageur.specialite ? ` · Spécialité ${nageur.specialite}` : ""}
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { niveau: "Département", place: nageur.rangDept, total: "sur 214" },
            { niveau: "Région", place: nageur.rangReg, total: "sur 1 380" },
            { niveau: "National", place: nageur.rangNat, total: "sur 9 640" },
          ].map((r) => (
            <div key={r.niveau} className="text-center rounded-xl px-4 py-3" style={{ minWidth: 96, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-strong)" }}>
              <div className="text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--ink-secondary)" }}>
                {r.niveau}
              </div>
              <div className="font-display text-2xl mt-0.5">{r.place ? `${r.place}e` : "—"}</div>
              <div className="text-[11px]" style={{ color: "#61789B" }}>
                {r.total}
              </div>
            </div>
          ))}
        </div>
      </div>

      <FicheNageur
        nageurId={nageur.id}
        perfs={nageur.performances.map((p) => ({
          epreuve: p.epreuve,
          temps: p.temps,
          points: p.points,
          niveau: p.niveau,
          deltaSaison: p.deltaSaison,
          rangNat: p.rangNat,
          saison: p.saison,
          tempsDebutSaison: p.tempsDebutSaison,
        }))}
        saisonActive={saisonActive?.label ?? null}
        technique={technique}
        absences={nageur.absences.map((a) => ({ date: a.date, motif: a.motif, statut: a.statut }))}
        presenceRate={nageur.presenceRate}
        assiduite={assiduite}
        criteresList={CRITERES}
        ffnIuf={nageur.ffnIuf}
        ffnSyncedAt={nageur.ffnSyncedAt ? nageur.ffnSyncedAt.toLocaleDateString("fr-FR") : null}
        membreDepuis={nageur.membreDepuis ? nageur.membreDepuis.toLocaleDateString("fr-FR") : null}
        inscriptions={nageur.inscriptions.map((i) => ({
          saison: i.saison.label,
          groupe: i.groupe?.nom ?? "—",
          coach: i.coach?.user.name ?? "—",
        }))}
      />
    </div>
  );
}
