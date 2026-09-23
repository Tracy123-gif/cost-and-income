import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card, CardTitle, PageHeader, Table, Th, Td, EmptyState, Badge } from "@/components/ui";

export default async function AuditPage() {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");

  const logs = await prisma.auditLog.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Audit / activity history" description="A record of financial and inventory changes. Nothing is ever silently overwritten." />
      <Card>
        <CardTitle>Recent activity</CardTitle>
        {logs.length === 0 ? (
          <EmptyState message="No activity recorded yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Entity</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <Td>{formatDateTime(log.createdAt)}</Td>
                  <Td className="font-medium text-zinc-900">{log.entityType}</Td>
                  <Td>
                    <Badge tone={log.action === "CREATE" ? "success" : log.action === "VOID" ? "danger" : "default"}>{log.action}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
