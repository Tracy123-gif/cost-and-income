import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle, PageHeader, Field, Input, Button, Table, Th, Td, EmptyState, Badge } from "@/components/ui";
import { createSupplierAction, toggleSupplierActiveAction } from "./actions";

export default async function SuppliersPage() {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");

  const suppliers = await prisma.supplier.findMany({
    where: { businessId: business.id },
    include: { _count: { select: { purchases: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Suppliers" description="Optional - track who you buy ingredients from." />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardTitle>All suppliers</CardTitle>
            {suppliers.length === 0 ? (
              <EmptyState message="No suppliers yet." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Contact</Th>
                    <Th>Purchases</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <Td className="font-medium text-zinc-900">{s.name}</Td>
                      <Td>{s.contact ?? "—"}</Td>
                      <Td>{s._count.purchases}</Td>
                      <Td>{s.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                      <Td>
                        <form action={toggleSupplierActiveAction.bind(null, s.id, !s.active)}>
                          <Button type="submit" variant="secondary">
                            {s.active ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <Card>
          <CardTitle>Add supplier</CardTitle>
          <form action={createSupplierAction} className="space-y-4">
            <Field label="Name">
              <Input name="name" required />
            </Field>
            <Field label="Contact (optional)">
              <Input name="contact" placeholder="Phone or email" />
            </Field>
            <Button type="submit" className="w-full">
              Add supplier
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
