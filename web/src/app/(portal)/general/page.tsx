import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, ProgressBar, SectionTitle } from "@/components/ui/Card";
import { PoleEffectifs } from "@/components/portal/PoleEffectifs";
import { hoursBetween } from "@/lib/format";
import { POLE_COLORS } from "@/lib/theme";

export default async function GeneralPage() {
  const [categories, coachs, creneaux, nageurs, absences] = await Promise.all([
    prisma.categorieEffectif.findMany(),
    prisma.coach.findMany({ include: { user: true } }),
    prisma.creneau.findMany({ include: { groupe: true, coach: { include: { user: true } } } }),
    prisma.nageur.findMany({ include: { absences: true } }),
    prisma.absence.findMany({ include: { nageur: true } }),
  ]);

  const totalLicencies = categories.reduce((a, c) => a + c.count, 0);
  const presenceMoy = nageurs.length
    ? Math.round(nageurs.reduce((a, n) => a + n.presenceRate, 0) / nageurs.length)
    : 0;
  const aCouvrir = creneaux.filter((c) => c.etat === "A_COUVRIR").length;

  const statsGlobal = [
    { icon: "⚑", value: String(totalLicencies), label: "Licenciés suivis" },
    { icon: "◉", value: String(coachs.length), label: "Coachs actifs" },
    { icon: "▦", value: String(creneaux.length), label: "Créneaux / semaine" },
    { icon: "✓", value: `${presenceMoy}%`, label: "Présence moy. club" },
  ];

  const chargeParCoach = coachs.map((c) => {
    const mine = creneaux.filter((cr) => cr.coachId === c.id);
    const heures = mine.reduce((a, cr) => a + hoursBetween(cr.debut, cr.fin), 0);
    return { nom: c.user.name, heures, count: mine.length };
  });
  const maxHeures = Math.max(1, ...chargeParCoach.map((c) => c.heures));

  const poleGroups = ["FORMATION", "COMPETITION", "SAUVETAGE", "LOISIR"] as const;
  const poles = poleGroups.map((pole) => {
    const cats = categories.filter((c) => c.pole === pole);
    const total = cats.reduce((a, c) => a + c.count, 0);
    return { pole, color: POLE_COLORS[pole], total, part: totalLicencies ? Math.round((total / totalLicencies) * 100) : 0, cats: cats.map((c) => ({ nom: c.nom, n: c.count })) };
  });

  const alertesBlessure = absences.filter((a) => a.statut === "BLESSURE" || a.statut === "A_TRAITER").slice(0, 2);
  const alertes = [
    ...alertesBlessure.map((a) => ({
      icon: a.statut === "BLESSURE" ? "⚠" : "▼",
      titre: `${a.nageur.nom} — ${a.motif}`,
      detail: a.statut === "BLESSURE" ? "Blessure signalée" : "Absence à traiter",
      href: `/nageurs/${a.nageurId}`,
    })),
    ...(aCouvrir > 0
      ? [{ icon: "▦", titre: `${aCouvrir} créneau${aCouvrir > 1 ? "x" : ""} à couvrir`, detail: "Voir le planning global", href: "/planning" }]
      : []),
  ].slice(0, 3);

  const podium = nageurs
    .slice()
    .sort((a, b) => b.pointsFFN - a.pointsFFN)
    .slice(0, 3)
    .map((n, i) => ({
      place: i + 1,
      nom: n.nom,
      ini: n.initiales,
      pts: n.pointsFFN,
      href: `/nageurs/${n.id}`,
    }));
  const podiumOrder = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;
  const medaille = ["#F2B33D", "#C8D4E4", "#D08A5A"];
  const heights = [118, 158, 88];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
        {statsGlobal.map((s) => (
          <Card key={s.label} padding={18}>
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center text-base"
              style={{ background: "rgba(30,123,255,0.14)", border: "1px solid rgba(30,123,255,0.3)" }}
            >
              {s.icon}
            </div>
            <div className="font-display text-[42px] leading-none mt-3.5">{s.value}</div>
            <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
              {s.label}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))" }}>
        <Card>
          <SectionTitle right="Heures / semaine">Charge par coach</SectionTitle>
          <div className="flex flex-col gap-3.5">
            {chargeParCoach.map((c) => (
              <div key={c.nom}>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <span className="font-semibold">{c.nom}</span>
                  <span style={{ color: "var(--ink-secondary)" }}>
                    {c.heures} h · {c.count} créneaux
                  </span>
                </div>
                <ProgressBar value={(c.heures / maxHeures) * 100} color="#1E7BFF" />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle right={`${totalLicencies} licenciés`}>Effectif par pôle</SectionTitle>
          <PoleEffectifs poles={poles} />
        </Card>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))" }}>
        <Card>
          <SectionTitle>Alertes actives</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {alertes.length === 0 && (
              <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                Aucune alerte active.
              </div>
            )}
            {alertes.map((a) => (
              <div
                key={a.titre}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                style={{ background: "rgba(232,68,43,0.08)", border: "1px solid rgba(232,68,43,0.25)" }}
              >
                <span className="text-[17px]">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{a.titre}</div>
                  <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                    {a.detail}
                  </div>
                </div>
                <Link
                  href={a.href}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                  style={{ border: "1px solid var(--border-strong)", background: "rgba(255,255,255,0.05)", color: "var(--ink)" }}
                >
                  Voir
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle right="Meilleurs points FFN">Podium du club</SectionTitle>
          <div className="grid grid-cols-3 gap-3 items-end pt-4">
            {podiumOrder.map((p) => (
              <Link key={p.nom} href={p.href} className="flex flex-col items-center gap-2.5">
                <div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center font-display text-lg"
                  style={{ background: "rgba(255,255,255,0.05)", border: `2px solid ${medaille[p.place - 1]}66` }}
                >
                  {p.ini}
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-semibold leading-tight">{p.nom}</div>
                </div>
                <div
                  className="w-full flex flex-col items-center justify-start gap-1 px-2 py-3 rounded-t-[10px]"
                  style={{
                    height: heights[p.place - 1],
                    border: "1px solid var(--border-strong)",
                    borderTop: `3px solid ${medaille[p.place - 1]}`,
                    background: "linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))",
                  }}
                >
                  <span className="font-display text-[34px] leading-none" style={{ color: medaille[p.place - 1] }}>
                    {p.place}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--ink-secondary)" }}>
                    {p.pts} pts
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
