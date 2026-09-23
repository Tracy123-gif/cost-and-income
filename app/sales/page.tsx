import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import { listRecipes } from "@/lib/services/recipes";
import { getAvailableBatchesForRecipe } from "@/lib/services/production";
import { listSales } from "@/lib/services/sales";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardTitle, PageHeader, Table, Th, Td, EmptyState, Badge, Button } from "@/components/ui";
import SalesForm from "./SalesForm";
import { recordSaleAction, voidSaleAction } from "./actions";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");
  const { onboarding } = await searchParams;

  const recipes = await listRecipes(business.id);
  const recipesWithBatches = await Promise.all(
    recipes.map(async (r) => ({
      id: r.id,
      productName: r.productName,
      sellingPrice: r.sellingPrice.toString(),
      batches: (await getAvailableBatchesForRecipe(r.id)).map((b) => ({
        id: b.id,
        costPerUnit: b.costPerUnit.toString(),
        unitsRemaining: b.unitsRemaining.toString(),
        producedAt: b.producedAt.toISOString(),
      })),
    })),
  );

  const sales = await listSales(business.id);

  async function action(formData: FormData) {
    "use server";
    if (onboarding) formData.set("onboarding", "1");
    await recordSaleAction(formData);
  }

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Revenue and cost of goods sold are calculated from your production batch cost automatically."
      />

      {onboarding && (
        <Card className="mb-6 border-zinc-900/10 bg-zinc-900 text-white">
          <p className="text-sm">Last step: record a sale from the batch you just produced, then check your Dashboard.</p>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardTitle>Sales history</CardTitle>
            {sales.length === 0 ? (
              <EmptyState message="No sales recorded yet." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Items</Th>
                    <Th>Revenue</Th>
                    <Th>COGS</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => {
                    const revenue = sale.items.reduce((s, i) => s + Number(i.lineRevenue), 0);
                    const cogs = sale.items.reduce((s, i) => s + Number(i.lineCogs), 0);
                    return (
                      <tr key={sale.id}>
                        <Td>{formatDateTime(sale.saleDate)}</Td>
                        <Td>{sale.items.map((i) => `${i.quantity.toString()} × ${i.recipe.productName}`).join(", ")}</Td>
                        <Td>{formatMoney(revenue, business.currency)}</Td>
                        <Td>{formatMoney(cogs, business.currency)}</Td>
                        <Td>
                          <Badge tone={sale.status === "COMPLETED" ? "success" : sale.status === "VOIDED" ? "danger" : "warning"}>
                            {sale.status}
                          </Badge>
                        </Td>
                        <Td>
                          {sale.status === "COMPLETED" && (
                            <form action={voidSaleAction.bind(null, sale.id)}>
                              <Button type="submit" variant="secondary">
                                Void
                              </Button>
                            </form>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <Card>
          <CardTitle>Record a sale</CardTitle>
          <SalesForm recipes={recipesWithBatches} currency={business.currency} action={action} />
        </Card>
      </div>
    </div>
  );
}
