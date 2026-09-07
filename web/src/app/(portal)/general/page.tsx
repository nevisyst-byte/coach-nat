import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, ProgressBar, SectionTitle } from "@/components/ui/Card";
import { PoleEffectifs } from "@/components/portal/PoleEffectifs";
import { PeriodeToggle } from "@/components/portal/PeriodeToggle";
import { ViewToggle } from "@/components/portal/ViewToggle";
import { hoursBetween, JOURS } from "@/lib/format";
import { POLE_COLORS } from "@/lib/theme";

const PALETTE = ["#1E7BFF", "#24C8FF", "#2ECC8F", "#F2B33D", "#E8442B", "#8C6BFF", "#5B7BA6"];

type InstanceRow = { variant: string | null; intensite: string | null; nage: string | null; volumeNage: number | null };

function aggregate(raw: InstanceRow[], field: "variant" | "intensite" | "nage") {
  const sums = new Map<string, number>();
  for (const r of raw) {
    const key = r[field];
    if (!key || !r.volumeNage) continue;
    sums.set(key, (sums.get(key) ?? 0) + r.volumeNage);
  }
  return Array.from(sums.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nom, m], i) => ({ nom, m, color: PALETTE[i % PALETTE.length] }));
}

function donut(items: { m: number; color: string }[]) {
  const total = items.reduce((a, r) => a + r.m, 0);
  let acc = 0;
  const stops = items
    .map((r) => {
      const from = (acc / total) * 360;
      acc += r.m;
      return `${r.color} ${from.toFixed(1)}deg ${((acc / total) * 360).toFixed(1)}deg`;
    })
    .join(", ");
  return { total, css: `conic-gradient(${stops})` };
}

export default async function GeneralPage({ searchParams }: { searchParams: Promise<{ vue?: string; periode?: string }> }) {
  const { vue, periode = "4" } = await searchParams;
  const session = await getSession();
  const isCoach = vue === "coach";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <ViewToggle
          options={[
            { value: "globale", label: "Vue générale" },
            { value: "coach", label: "Tableau de bord coach" },
          ]}
          current={isCoach ? "coach" : "globale"}
        />
      </div>
      {isCoach ? <CoachDashboard coachId={session?.coachId ?? null} periode={periode} /> : <GlobalDashboard />}
    </div>
  );
}

async function GlobalDashboard() {
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
  const heights = [158, 118, 88];

  return (
    <>
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
    </>
  );
}

async function CoachDashboard({ coachId, periode }: { coachId: string | null; periode: string }) {
  if (!coachId) {
    return (
      <Card>
        <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          Cette vue est réservée aux comptes coach.
        </div>
      </Card>
    );
  }

  const days = periode === "8" ? 56 : periode === "saison" ? 252 : 28;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [creneaux, groupes, conges, seanceInstances] = await Promise.all([
    prisma.creneau.findMany({ where: { coachId }, include: { groupe: { include: { nageurs: true } } } }),
    prisma.groupe.findMany({ where: { coachId }, include: { nageurs: true } }),
    prisma.conge.findMany({ where: { coachId } }),
    prisma.seanceInstance.findMany({ where: { coachId, date: { gte: since } } }),
  ]);

  const heures = creneaux.reduce((a, c) => a + hoursBetween(c.debut, c.fin), 0);
  const groupesIds = new Set(groupes.map((g) => g.id));

  const statsCoach = [
    { icon: "▦", value: String(creneaux.length), label: "Créneaux / semaine" },
    { icon: "⚑", value: String(groupesIds.size), label: "Groupes encadrés" },
    { icon: "✈", value: String(conges.length), label: "Congés déclarés" },
    { icon: "◷", value: `${heures} h`, label: "Heures hebdo" },
  ];

  const parNage = aggregate(seanceInstances, "nage");
  const parIntensite = aggregate(seanceInstances, "intensite");
  const parVariant = aggregate(seanceInstances, "variant");
  const camemberts = [
    { titre: "Par nage", items: parNage },
    { titre: "Par intensité", items: parIntensite },
    { titre: "Par variant", items: parVariant },
  ].filter((c) => c.items.length > 0);

  return (
    <>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        {statsCoach.map((s) => (
          <Card key={s.label} padding={18}>
            <div
              className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[15px]"
              style={{ background: "rgba(232,68,43,0.14)", border: "1px solid rgba(232,68,43,0.3)" }}
            >
              {s.icon}
            </div>
            <div className="font-display text-[40px] leading-none mt-3.5">{s.value}</div>
            <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
              {s.label}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-baseline justify-between mb-4 gap-2.5 flex-wrap">
          <h2 className="font-display text-[19px] tracking-[0.06em]">Mes groupes</h2>
          <Link
            href="/absences"
            className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold"
            style={{ border: "1px solid rgba(36,200,255,0.4)", background: "rgba(36,200,255,0.1)", color: "#7FDCFF" }}
          >
            Gérer les absences
          </Link>
        </div>
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          {groupes.length === 0 && (
            <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
              Aucun groupe ne t&apos;est encore assigné.
            </div>
          )}
          {groupes.map((g) => {
            const presenceMoy = g.nageurs.length
              ? Math.round(g.nageurs.reduce((a, n) => a + n.presenceRate, 0) / g.nageurs.length)
              : 0;
            return (
              <div key={g.id} className="rounded-xl p-4" style={{ border: "1px solid var(--border)", borderLeft: `4px solid ${g.color}`, background: "rgba(255,255,255,0.03)" }}>
                <div className="flex justify-between items-start gap-2.5">
                  <div>
                    <div className="font-display text-xl">{g.nom}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                      {g.categorie}
                    </div>
                  </div>
                  <div className="font-display text-2xl">{g.nageurs.length}</div>
                </div>
                <div className="mt-3.5 flex flex-col gap-2">
                  <div className="flex justify-between text-xs" style={{ color: "var(--ink-secondary)" }}>
                    <span>Présence moyenne</span>
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>{presenceMoy}%</span>
                  </div>
                  <ProgressBar value={presenceMoy} color={g.color} height={7} />
                  <div className="flex justify-between text-xs" style={{ color: "var(--ink-secondary)" }}>
                    <span>Objectif en cours</span>
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>{g.objectif ?? "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card padding={22}>
        <div className="flex items-baseline justify-between gap-3.5 flex-wrap mb-5">
          <div>
            <h2 className="font-display text-[19px] tracking-[0.06em]">Répartition de la charge</h2>
            <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
              Volume réellement planifié via Entraînement
            </div>
          </div>
          <PeriodeToggle current={periode} />
        </div>
        {camemberts.length === 0 ? (
          <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Aucune séance planifiée sur cette période. Utilise{" "}
            <Link href="/entrainement" style={{ color: "#7FDCFF" }}>
              Entraînement
            </Link>{" "}
            pour planifier un plan sur un groupe et commencer à alimenter cette charge.
          </div>
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))" }}>
            {camemberts.map((ch) => {
              const { total, css } = donut(ch.items);
              return (
                <div key={ch.titre}>
                  <div className="text-[11px] tracking-[0.14em] uppercase mb-3.5" style={{ color: "#61789B" }}>
                    {ch.titre}
                  </div>
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="relative w-[132px] h-[132px] shrink-0">
                      <div className="absolute inset-0 rounded-full" style={{ background: css }} />
                      <div className="absolute inset-[27px] rounded-full flex flex-col items-center justify-center" style={{ background: "var(--bg-card)" }}>
                        <span className="font-display text-[19px] leading-none">{(total / 1000).toFixed(1).replace(".", ",")} km</span>
                        <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "#61789B" }}>
                          nagés
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-1" style={{ minWidth: 132 }}>
                      {ch.items.map((r) => (
                        <div key={r.nom} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.color }} />
                          <span className="flex-1 font-semibold">{r.nom}</span>
                          <span style={{ color: "var(--ink-secondary)" }}>{(r.m / 1000).toFixed(1).replace(".", ",")} km</span>
                          <span className="font-bold" style={{ minWidth: 34, textAlign: "right" }}>
                            {Math.round((r.m / total) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <Card>
          <SectionTitle>Prochaines séances</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {creneaux.length === 0 && (
              <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                Aucun créneau cette semaine.
              </div>
            )}
            {creneaux
              .slice()
              .sort((a, b) => a.jour - b.jour || a.debut.localeCompare(b.debut))
              .map((c) => (
                <div key={c.id} className="flex items-center gap-3.5 rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div className="text-center" style={{ minWidth: 52 }}>
                    <div className="font-display text-[13px] tracking-[0.1em] uppercase" style={{ color: "var(--ink-secondary)" }}>
                      {JOURS[c.jour]}
                    </div>
                    <div className="font-display text-[22px]">{c.debut}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{c.groupe.nom}</div>
                    <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                      {c.groupe.objectif ?? c.bassin} · {c.bassin}
                    </div>
                  </div>
                  <Link href="/planning?vue=moi" className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}>
                    Ouvrir
                  </Link>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>À traiter</SectionTitle>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(30,123,255,0.10)", border: "1px solid rgba(30,123,255,0.3)" }}>
              <span className="text-[17px]">✎</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Feuilles de présence</div>
                <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                  Pointer les séances de la semaine
                </div>
              </div>
              <Link href="/presences" className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: "#1E7BFF" }}>
                Saisir
              </Link>
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(232,68,43,0.10)", border: "1px solid rgba(232,68,43,0.3)" }}>
              <span className="text-[17px]">☰</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Notation technique</div>
                <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                  Mettre à jour la cotation par nage
                </div>
              </div>
              <Link href="/nageurs" className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: "#E8442B" }}>
                Noter
              </Link>
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-strong)" }}>
              <span className="text-[17px]">⟳</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Cycle à renouveler</div>
                <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                  Générer le prochain cycle thématique
                </div>
              </div>
              <Link href="/entrainement" className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ color: "var(--ink)", border: "1px solid var(--border-strong)" }}>
                Générer
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
