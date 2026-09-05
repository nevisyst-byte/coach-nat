import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ZoneScolaireSetting } from "@/components/admin/ZoneScolaireSetting";

export default async function AdminHome() {
  const [users, groupes, nageurs, stages, echeances, settings] = await Promise.all([
    prisma.user.count(),
    prisma.groupe.count(),
    prisma.nageur.count(),
    prisma.stage.count(),
    prisma.echeance.count(),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const cards = [
    { label: "Comptes", value: users, href: "/admin/utilisateurs" },
    { label: "Groupes", value: groupes, href: "/admin/groupes" },
    { label: "Nageurs", value: nageurs, href: "/admin/nageurs" },
    { label: "Stages", value: stages, href: "/stages" },
    { label: "Échéances", value: echeances, href: "/admin/echeances" },
  ];

  return (
    <div className="flex flex-col gap-4">
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
      <Card>
        <SectionTitle>Réglages du club</SectionTitle>
        <div className="text-[13px] mb-3" style={{ color: "var(--ink-secondary)" }}>
          Zone de vacances scolaires — détermine quand les créneaux réguliers marqués « hors vacances » se
          mettent en pause et quand les stages apparaissent au planning.
        </div>
        <ZoneScolaireSetting zone={settings?.zoneScolaire ?? "B"} />
      </Card>
    </div>
  );
}
