import { prisma } from "@/lib/prisma";
import { Card, SectionTitle } from "@/components/ui/Card";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { UsersTable } from "@/components/admin/UsersTable";

export default async function UtilisateursPage() {
  const users = await prisma.user.findMany({ include: { coach: true }, orderBy: { createdAt: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Créer un compte</SectionTitle>
        <CreateUserForm />
      </Card>
      <Card padding={0} className="overflow-hidden">
        <UsersTable
          users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, initials: u.coach?.initials ?? null }))}
        />
      </Card>
    </div>
  );
}
