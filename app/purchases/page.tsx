import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import { listIngredients } from "@/lib/services/ingredients";
import { listPurchases } from "@/lib/services/purchases";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatNumber, formatDate } from "@/lib/format";
import { BASE_UNIT_LABEL, PURCHASE_UNIT_LABEL } from "@/lib/units";
import { Card, CardTitle, PageHeader, Table, Th, Td, EmptyState } from "@/components/ui";
import PurchaseForm from "./PurchaseForm";

export default async function PurchasesPage() {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");

  const [ingredients, purchases, suppliers] = await Promise.all([
    listIngredients(business.id),
    listPurchases(business.id),
    prisma.supplier.findMany({ where: { businessId: business.id, active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Enter what you paid for a package - we standardize it into a base unit and update your weighted-average cost automatically."
      />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardTitle>Purchase history</CardTitle>
            {purchases.length === 0 ? (
              <EmptyState message="No purchases recorded yet." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Ingredient</Th>
                    <Th>Package</Th>
                    <Th>Standardized</Th>
                    <Th>Price</Th>
                    <Th>Unit cost</Th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <Td>{formatDate(p.purchaseDate)}</Td>
                      <Td className="font-medium text-zinc-900">{p.ingredient.name}</Td>
                      <Td>
                        {formatNumber(p.packageQuantity.toString())} {PURCHASE_UNIT_LABEL[p.packageUnit]}
                      </Td>
                      <Td>
                        {formatNumber(p.quantityInBaseUnit.toString())} {BASE_UNIT_LABEL[p.ingredient.baseUnit]}
                      </Td>
                      <Td>{formatMoney(p.totalPrice.toString(), business.currency)}</Td>
                      <Td>
                        {formatMoney(p.unitCost.toString(), business.currency)}/{BASE_UNIT_LABEL[p.ingredient.baseUnit]}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <Card>
          <CardTitle>Record a purchase</CardTitle>
          <PurchaseForm
            ingredients={ingredients.map((i) => ({ id: i.id, name: i.name, baseUnit: i.baseUnit }))}
            suppliers={suppliers}
          />
        </Card>
      </div>
    </div>
  );
}
