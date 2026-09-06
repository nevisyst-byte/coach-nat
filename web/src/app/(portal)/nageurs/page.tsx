import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { NageursFilterBar } from "@/components/portal/NageursFilterBar";
import { NageursListClient } from "@/components/portal/NageursListClient";
import { POLE_LABELS, POLE_COLORS } from "@/lib/theme";
import { getSession } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

const POLE_ORDER = ["COMPETITION", "FORMATION", "SAUVETAGE", "LOISIR"] as const;

export default async function NageursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pole?: string }>;
}) {
  const { q, pole } = await searchParams;
  const session = await getSession();

  const where: Prisma.NageurWhereInput = {};
  if (q) where.nom = { contains: q, mode: "insensitive" };
  if (pole) where.groupe = { pole: pole as (typeof POLE_ORDER)[number] };

  const [nageurs, allGroupes] = await Promise.all([
    prisma.nageur.findMany({ where, include: { groupe: true }, orderBy: { pointsFFN: "desc" } }),
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
  ]);

  const mapRow = (n: (typeof nageurs)[number]) => ({
    id: n.id,
    nom: n.nom,
    initiales: n.initiales,
    age: n.age,
    categorie: n.categorie,
    specialite: n.specialite,
    groupeId: n.groupeId,
    groupeNom: n.groupe?.nom ?? null,
    pointsFFN: n.pointsFFN,
    rangDept: n.rangDept,
    rangReg: n.rangReg,
    rangNat: n.rangNat,
    presenceRate: n.presenceRate,
  });

  const groupesByPole = [
    ...POLE_ORDER.map((p) => ({
      pole: p,
      nom: POLE_LABELS[p],
      color: POLE_COLORS[p],
      rows: nageurs.filter((n) => n.groupe?.pole === p).map(mapRow),
    })),
    { pole: "SANS_GROUPE", nom: "Sans groupe", color: "#61789B", rows: nageurs.filter((n) => !n.groupe).map(mapRow) },
  ].filter((g) => g.rows.length > 0);

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

      <NageursListClient
        groupesByPole={groupesByPole}
        allGroupes={allGroupes.map((g) => ({ id: g.id, nom: g.nom, categorie: g.categorie }))}
        isAdmin={session?.role === "ADMIN"}
      />
    </Card>
  );
}
