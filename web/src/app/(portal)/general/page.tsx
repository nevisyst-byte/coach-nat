import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, ProgressBar, SectionTitle } from "@/components/ui/Card";
import { Camembert } from "@/components/ui/Camembert";
import { PoleEffectifs } from "@/components/portal/PoleEffectifs";
import { ViewToggle } from "@/components/portal/ViewToggle";
import { hoursBetween, JOURS } from "@/lib/format";
import { POLE_COLORS } from "@/lib/theme";
import { toDateInputValue } from "@/lib/week";
import type { Combo } from "@/lib/seance-generator";

const PALETTE = ["#1E7BFF", "#24C8FF", "#2ECC8F", "#F2B33D", "#E8442B", "#8C6BFF", "#5B7BA6"];

type ComboPoids = { variant: string | null; intensite: string | null; nage: string | null; pourcentage: number | null };

function aggregate(raw: ComboPoids[], field: "variant" | "intensite" | "nage") {
  const sums = new Map<string, number>();
  for (const r of raw) {
    const key = r[field];
    if (!key || !r.pourcentage) continue;
    sums.set(key, (sums.get(key) ?? 0) + r.pourcentage);
  }
  return Array.from(sums.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nom, m], i) => ({ nom, m, color: PALETTE[i % PALETTE.length] }));
}

// Prochaine date (aujourd'hui compris) tombant sur ce jour de la semaine —
// pour lier une carte "séance" à sa vraie occurrence datée plutôt qu'au
// planning générique.
function prochaineOccurrence(jour: number, ref: Date = new Date()): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  while ((d.getDay() + 6) % 7 !== jour) d.setDate(d.getDate() + 1);
  return d;
}

export default async function GeneralPage({ searchParams }: { searchParams: Promise<{ vue?: string; coachId?: string }> }) {
  const { vue, coachId: coachIdParam } = await searchParams;
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
      {isCoach ? <CoachDashboard sessionCoachId={session?.coachId ?? null} isAdmin={session?.role === "ADMIN"} coachIdParam={coachIdParam} /> : <GlobalDashboard />}
    </div>
  );
}

async function GlobalDashboard() {
  const [coachs, creneaux, nageurs, absences] = await Promise.all([
    prisma.coach.findMany({ include: { user: true } }),
    prisma.creneau.findMany({ include: { groupe: true, coach: { include: { user: true } } } }),
    prisma.nageur.findMany({ include: { absences: true, groupe: true } }),
    prisma.absence.findMany({ include: { nageur: true } }),
  ]);

  // Effectif compté sur les vraies fiches Nageur (plus sur un décompte
  // manuel séparé, CategorieEffectif) : sinon les deux dérivent et on peut
  // afficher plus de "licenciés" que de nageurs réellement suivis, ce qui
  // n'a pas de sens une fois que les fiches nageurs sont la source réelle.
  const totalLicencies = nageurs.length;
  const aCouvrir = creneaux.filter((c) => c.etat === "A_COUVRIR").length;

  const chargeParCoach = coachs.map((c) => {
    const mine = creneaux.filter((cr) => cr.coachId === c.id);
    const heures = mine.reduce((a, cr) => a + hoursBetween(cr.debut, cr.fin), 0);
    return { nom: c.user.name, heures, count: mine.length };
  });
  const maxHeures = Math.max(1, ...chargeParCoach.map((c) => c.heures));

  const poleGroups = ["FORMATION", "COMPETITION", "SAUVETAGE", "LOISIR"] as const;
  const poles = poleGroups.map((pole) => {
    const dansCePole = nageurs.filter((n) => n.groupe?.pole === pole);
    const parCategorie = new Map<string, number>();
    for (const n of dansCePole) {
      const cat = n.groupe?.categorie ?? n.categorie;
      parCategorie.set(cat, (parCategorie.get(cat) ?? 0) + 1);
    }
    const total = dansCePole.length;
    return {
      pole,
      color: POLE_COLORS[pole],
      total,
      part: totalLicencies ? Math.round((total / totalLicencies) * 100) : 0,
      cats: Array.from(parCategorie.entries()).map(([nom, n]) => ({ nom, n })),
    };
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

async function CoachDashboard({
  sessionCoachId,
  isAdmin,
  coachIdParam,
}: {
  sessionCoachId: string | null;
  isAdmin: boolean;
  coachIdParam: string | undefined;
}) {
  // Un admin n'a pas de fiche coach propre (pas de "mon" tableau de bord),
  // mais doit pouvoir consulter celui de n'importe quel coach plutôt que de
  // se voir cette vue interdite — un coach, lui, ne voit que la sienne.
  let coachId = sessionCoachId;
  let tousLesCoachs: { id: string; nom: string }[] = [];
  if (isAdmin) {
    const coachs = await prisma.coach.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } });
    tousLesCoachs = coachs.map((c) => ({ id: c.id, nom: c.user.name }));
    coachId = (coachIdParam && tousLesCoachs.some((c) => c.id === coachIdParam) ? coachIdParam : tousLesCoachs[0]?.id) ?? null;
  }

  if (!coachId) {
    return (
      <Card>
        <div className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          {isAdmin ? "Aucun coach à afficher pour le moment." : "Cette vue est réservée aux comptes coach."}
        </div>
      </Card>
    );
  }

  const [creneaux, groupes, conges] = await Promise.all([
    prisma.creneau.findMany({ where: { coachId }, include: { groupe: { include: { nageurs: true } } } }),
    prisma.groupe.findMany({ where: { coachId }, include: { nageurs: true } }),
    prisma.conge.findMany({ where: { coachId } }),
  ]);

  const heures = creneaux.reduce((a, c) => a + hoursBetween(c.debut, c.fin), 0);
  const groupesIds = new Set(groupes.map((g) => g.id));

  // % cible par nage/intensité/variant tel que fixé à la création du/des
  // plan(s) d'entraînement actifs aujourd'hui pour les groupes du coach —
  // pas un volume réalisé (rien ne trace de volume réellement nagé dans
  // l'appli), juste la répartition visée sur la période en cours.
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const plans = groupesIds.size
    ? await prisma.planEntrainement.findMany({
        where: { groupes: { some: { id: { in: Array.from(groupesIds) } } }, dateDebut: { lte: aujourdhui }, dateFin: { gte: aujourdhui } },
      })
    : [];
  const combosPoids: ComboPoids[] = [];
  for (const plan of plans) {
    const combos = plan.combos as unknown as Combo[] | null;
    if (combos && combos.length > 0) {
      for (const combo of combos) combosPoids.push({ variant: combo.variant, intensite: combo.intensite, nage: combo.nage, pourcentage: combo.pourcentage });
    } else if (plan.variant && plan.intensite && plan.nage) {
      combosPoids.push({ variant: plan.variant, intensite: plan.intensite, nage: plan.nage, pourcentage: 100 });
    }
  }

  const statsCoach = [
    { icon: "▦", value: String(creneaux.length), label: "Créneaux / semaine" },
    { icon: "⚑", value: String(groupesIds.size), label: "Groupes encadrés" },
    { icon: "✈", value: String(conges.length), label: "Congés déclarés" },
    { icon: "◷", value: `${heures} h`, label: "Heures hebdo" },
  ];

  const parNage = aggregate(combosPoids, "nage");
  const parIntensite = aggregate(combosPoids, "intensite");
  const parVariant = aggregate(combosPoids, "variant");
  const camemberts = [
    { titre: "Par nage", items: parNage },
    { titre: "Par intensité", items: parIntensite },
    { titre: "Par variant", items: parVariant },
  ].filter((c) => c.items.length > 0);

  return (
    <>
      {isAdmin && tousLesCoachs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Vue de :
          </span>
          {tousLesCoachs.map((c) => (
            <Link
              key={c.id}
              href={`/general?vue=coach&coachId=${c.id}`}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
              style={{
                background: c.id === coachId ? "linear-gradient(135deg,#1E7BFF,#0F5FD6)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${c.id === coachId ? "transparent" : "var(--border)"}`,
                color: c.id === coachId ? "#fff" : "var(--ink-body)",
              }}
            >
              {c.nom}
            </Link>
          ))}
        </div>
      )}
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
        <div className="mb-5">
          <h2 className="font-display text-[19px] tracking-[0.06em]">Répartition cible</h2>
          <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
            % fixé à la création du/des plan{plans.length > 1 ? "s" : ""} d&apos;entraînement actif{plans.length > 1 ? "s" : ""} aujourd&apos;hui
          </div>
        </div>
        {camemberts.length === 0 ? (
          <div className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Aucun plan actif avec une répartition chiffrée pour tes groupes. Utilise{" "}
            <Link href="/entrainement" style={{ color: "#7FDCFF" }}>
              Entraînement
            </Link>{" "}
            pour planifier un plan sur un groupe et fixer sa répartition.
          </div>
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))" }}>
            {camemberts.map((ch) => (
              <Camembert key={ch.titre} titre={ch.titre} items={ch.items} totalLabel="cible" formatTotal={() => "100%"} formatValeur={() => ""} />
            ))}
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
                  <Link
                    href={`/presences?slot=reg:${c.id}&date=${toDateInputValue(prochaineOccurrence(c.jour))}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                  >
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
