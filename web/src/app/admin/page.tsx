import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

export default async function AdminHome() {
  const [users, groupes, nageurs, stages, echeances] = await Promise.all([
    prisma.user.count(),
    prisma.groupe.count(),
    prisma.nageur.count(),
    prisma.stage.count(),
    prisma.echeance.count(),
  ]);

  const cards = [
    { label: "Comptes", value: users, href: "/admin/utilisateurs" },
    { label: "Groupes", value: groupes, href: "/admin/groupes" },
    { label: "Nageurs", value: nageurs, href: "/admin/nageurs" },
    { label: "Stages", value: stages, href: "/stages" },
    { label: "Échéances", value: echeances, href: "/admin/echeances" },
  ];

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
      {cards.map((c) => (
        <Link key={c.label} href={c.href}>
          <Card padding={20}>
            <div className="font-display text-4xl">{c.value}</div>
            <div className="text-[13px] mt-1" style={{ color: "var(--ink-secondary)" }}>
              {c.label}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
