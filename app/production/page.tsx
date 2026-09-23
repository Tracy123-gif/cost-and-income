import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import { listRecipes } from "@/lib/services/recipes";
import { listProductionBatches } from "@/lib/services/production";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardTitle, PageHeader, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import ProductionForm from "./ProductionForm";
import { recordProductionAction } from "./actions";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string; recipeId?: string }>;
}) {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");
  const { onboarding, recipeId } = await searchParams;

  const [recipes, batches] = await Promise.all([listRecipes(business.id), listProductionBatches(business.id)]);

  async function action(formData: FormData) {
    "use server";
    if (onboarding) formData.set("onboarding", "1");
    await recordProductionAction(formData);
  }

  return (
    <div>
      <PageHeader
        title="Production"
        description="Post a batch and we'll deduct the ingredients from inventory and calculate the true cost per unit."
      />

      {onboarding && (
        <Card className="mb-6 border-zinc-900/10 bg-zinc-900 text-white">
          <p className="text-sm">Almost there: record your first production batch, then head to Sales to log a sale.</p>
        </Card>
      )}

      {recipes.length === 0 ? (
        <Card>
          <EmptyState message="Create a recipe before recording production." />
          <div className="flex justify-center">
            <LinkButton href="/recipes/new">Create a recipe</LinkButton>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardTitle>Production history</CardTitle>
              {batches.length === 0 ? (
                <EmptyState message="No production recorded yet." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Product</Th>
                      <Th>Planned</Th>
                      <Th>Actual</Th>
                      <Th>Batch cost</Th>
                      <Th>Cost/unit</Th>
                      <Th>Remaining</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b.id}>
                        <Td>{formatDateTime(b.producedAt)}</Td>
                        <Td className="font-medium text-zinc-900">{b.recipe.productName}</Td>
                        <Td>{b.plannedOutput.toString()}</Td>
                        <Td>{b.actualOutput.toString()}</Td>
                        <Td>{formatMoney(b.totalBatchCost.toString(), business.currency)}</Td>
                        <Td>{formatMoney(b.costPerUnit.toString(), business.currency)}</Td>
                        <Td>{b.unitsRemaining.toString()}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          </div>
          <Card>
            <CardTitle>Record production</CardTitle>
            <ProductionForm
              recipes={recipes.map((r) => ({
                id: r.id,
                productName: r.productName,
                outputQuantity: r.outputQuantity.toString(),
                outputUnit: r.outputUnit,
                packagingCost: r.packagingCost.toString(),
                directLaborCost: r.directLaborCost.toString(),
                otherDirectCost: r.otherDirectCost.toString(),
                ingredients: r.ingredients.map((ri) => ({
                  ingredientId: ri.ingredientId,
                  name: ri.ingredient.name,
                  baseUnit: ri.ingredient.baseUnit,
                  quantityPerBatch: ri.quantity.toString(),
                  avgCostPerUnit: ri.ingredient.avgCostPerUnit.toString(),
                  currentStock: ri.ingredient.currentStock.toString(),
                })),
              }))}
              currency={business.currency}
              action={action}
              defaultRecipeId={recipeId}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
