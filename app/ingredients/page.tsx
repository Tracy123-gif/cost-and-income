import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import { listIngredients } from "@/lib/services/ingredients";
import { formatMoney, formatNumber } from "@/lib/format";
import { BASE_UNIT_LABEL } from "@/lib/units";
import { Card, CardTitle, PageHeader, Table, Th, Td, Badge, EmptyState } from "@/components/ui";
import IngredientForm from "./IngredientForm";

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");
  const { onboarding } = await searchParams;

  const ingredients = await listIngredients(business.id);

  return (
    <div>
      <PageHeader
        title="Ingredients & Inventory"
        description="Buy in bulk, use standardized units. We convert kg/litres to g/ml automatically so you never do the maths."
      />

      {onboarding && ingredients.length === 0 && (
        <Card className="mb-6 border-zinc-900/10 bg-zinc-900 text-white">
          <p className="text-sm">
            Step 1 of 2: add your first ingredient below (e.g. Flour, measured in grams). Next you&apos;ll create a recipe with it.
          </p>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardTitle>All ingredients</CardTitle>
            {ingredients.length === 0 ? (
              <EmptyState message="No ingredients yet. Add your first one to get started." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Stock</Th>
                    <Th>Avg cost</Th>
                    <Th>Value</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing) => {
                    const lowStock = Number(ing.currentStock) <= Number(ing.minStockLevel);
                    const value = Number(ing.currentStock) * Number(ing.avgCostPerUnit);
                    return (
                      <tr key={ing.id}>
                        <Td>
                          <Link href={`/ingredients/${ing.id}`} className="font-medium text-zinc-900 hover:underline">
                            {ing.name}
                          </Link>
                          {ing.category && <div className="text-xs text-zinc-400">{ing.category}</div>}
                        </Td>
                        <Td>
                          {formatNumber(ing.currentStock.toString())} {BASE_UNIT_LABEL[ing.baseUnit]}{" "}
                          {lowStock && <Badge tone="warning">Low stock</Badge>}
                        </Td>
                        <Td>
                          {formatMoney(ing.avgCostPerUnit.toString(), business.currency)}/{BASE_UNIT_LABEL[ing.baseUnit]}
                        </Td>
                        <Td>{formatMoney(value, business.currency)}</Td>
                        <Td>
                          <Link href={`/ingredients/${ing.id}`} className="text-zinc-500 hover:text-zinc-900">
                            Manage →
                          </Link>
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
          <CardTitle>Add ingredient</CardTitle>
          <IngredientForm onboarding={Boolean(onboarding)} />
        </Card>
      </div>
    </div>
  );
}
