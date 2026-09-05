import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

export default async function UtilisateursPage() {
  const users = await prisma.user.findMany({ include: { coach: true }, orderBy: { createdAt: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Créer un compte</SectionTitle>
        <CreateUserForm />
      </Card>
      <Card padding={0} className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["Nom", "Email", "Rôle", "Initiales"].map((h) => (
                <th key={h} className="text-left text-[11px] tracking-[0.12em] uppercase px-5 py-3" style={{ color: "#61789B" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="px-5 py-3 text-sm font-semibold">{u.name}</td>
                <td className="px-5 py-3 text-[13px]" style={{ color: "var(--ink-body)" }}>
                  {u.email}
                </td>
                <td className="px-5 py-3">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-md"
                    style={{ background: u.role === "ADMIN" ? "rgba(232,68,43,0.16)" : "rgba(30,123,255,0.16)", color: u.role === "ADMIN" ? "#FF9179" : "#7FDCFF" }}
                  >
                    {u.role === "ADMIN" ? "Administrateur" : "Coach"}
                  </span>
                </td>
                <td className="px-5 py-3 text-[13px]" style={{ color: "var(--ink-body)" }}>
                  {u.coach?.initials ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
