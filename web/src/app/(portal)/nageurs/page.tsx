import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { NageursFilterBar } from "@/components/portal/NageursFilterBar";
import { initialsColor } from "@/lib/format";
import { POLE_LABELS, POLE_COLORS } from "@/lib/theme";
import type { Prisma } from "@/generated/prisma/client";

const POLE_ORDER = ["COMPETITION", "FORMATION", "SAUVETAGE", "LOISIR"] as const;

export default async function NageursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pole?: string }>;
}) {
  const { q, pole } = await searchParams;

  const where: Prisma.NageurWhereInput = {};
  if (q) where.nom = { contains: q, mode: "insensitive" };
  if (pole) where.groupe = { pole: pole as (typeof POLE_ORDER)[number] };

  const nageurs = await prisma.nageur.findMany({ where, include: { groupe: true }, orderBy: { pointsFFN: "desc" } });

  const groupes = POLE_ORDER.map((p) => ({
    pole: p,
    nom: POLE_LABELS[p],
    color: POLE_COLORS[p],
    rows: nageurs.filter((n) => n.groupe?.pole === p),
  })).filter((g) => g.rows.length > 0);

  return (
    <Card padding={0} className="overflow-hidden">
      <NageursFilterBar />

      {nageurs.length === 0 && (
        <div className="py-14 px-6 text-center">
          <div className="font-display text-[22px]" style={{ color: "var(--ink-body)" }}>
            Aucun nageur trouvé
          </div>
          <div className="text-[13px] mt-1.5" style={{ color: "var(--ink-secondary)" }}>
            Essaie un autre nom, ou retire le filtre de pôle.
          </div>
          <Link
            href="/nageurs"
            className="inline-block mt-4 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold"
            style={{ border: "1px solid var(--border-strong)", background: "rgba(255,255,255,0.05)", color: "var(--ink)" }}
          >
            Réinitialiser la recherche
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4 p-4 md:p-5">
        {groupes.map((g) => (
          <div key={g.pole} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", borderTop: `3px solid ${g.color}`, background: "var(--bg-card)" }}>
            <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
              <span className="font-display text-[17px] tracking-[0.05em] uppercase">{g.nom}</span>
              <span className="text-[13px]" style={{ color: "var(--ink-secondary)" }}>
                {g.rows.length} nageur{g.rows.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 760 }}>
                <tbody>
                  {g.rows.map((n) => {
                    const p = n.presenceRate;
                    const presBg = p >= 85 ? "rgba(46,204,143,0.14)" : p >= 70 ? "rgba(242,179,61,0.15)" : "rgba(232,68,43,0.16)";
                    const presFg = p >= 85 ? "#2ECC8F" : p >= 70 ? "#F2B33D" : "#E8442B";
                    return (
                      <tr key={n.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td className="px-5 py-3.5">
                          <Link href={`/nageurs/${n.id}`} className="flex items-center gap-2.5">
                            <div
                              className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: initialsColor(n.nom) }}
                            >
                              {n.initiales}
                            </div>
                            <div>
                              <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                                {n.nom}
                              </div>
                              <div className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                                {n.age} ans · {n.specialite}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3.5 text-[13px]" style={{ color: "var(--ink-body)" }}>
                          {n.categorie}
                        </td>
                        <td className="px-3 py-3.5 text-[13px]" style={{ color: "var(--ink-body)" }}>
                          {n.groupe?.nom ?? "—"}
                        </td>
                        <td className="px-3 py-3.5 text-right font-display text-xl">{n.pointsFFN || "—"}</td>
                        <td className="px-3 py-3.5 text-right text-[13px]" style={{ color: "var(--ink-body)" }}>
                          {n.rangDept ? `${n.rangDept} / ${n.rangReg} / ${n.rangNat}` : "— / — / —"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: presBg, color: presFg }}>
                            {n.presenceRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
