import { notFound } from "next/navigation";
import Link from "next/link";
import { getRecipe } from "@/lib/services/recipes";
import { listIngredients } from "@/lib/services/ingredients";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardTitle, PageHeader, Table, Th, Td, EmptyState, LinkButton } from "@/components/ui";
import RecipeForm from "../RecipeForm";
import { updateRecipeAction } from "../actions";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let recipe;
  try {
    recipe = await getRecipe(id);
  } catch {
    notFound();
  }

  const business = await prisma.business.findUniqueOrThrow({ where: { id: recipe.businessId } });
  const ingredients = await listIngredients(business.id);
  const batches = await prisma.productionBatch.findMany({
    where: { recipeId: id },
    orderBy: { producedAt: "desc" },
    take: 10,
  });

  const action = updateRecipeAction.bind(null, id);

  return (
    <div>
      <PageHeader
        title={recipe.productName}
        description={`Batch of ${recipe.outputQuantity.toString()} ${recipe.outputUnit}`}
        action={<LinkButton href="/production">Record production →</LinkButton>}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardTitle>Edit recipe</CardTitle>
            <RecipeForm
              ingredients={ingredients.map((i) => ({
                id: i.id,
                name: i.name,
                baseUnit: i.baseUnit,
                avgCostPerUnit: i.avgCostPerUnit.toString(),
              }))}
              initial={{
                productName: recipe.productName,
                sku: recipe.sku ?? "",
                outputQuantity: recipe.outputQuantity.toString(),
                outputUnit: recipe.outputUnit,
                packagingCost: recipe.packagingCost.toString(),
                directLaborCost: recipe.directLaborCost.toString(),
                otherDirectCost: recipe.otherDirectCost.toString(),
                sellingPrice: recipe.sellingPrice.toString(),
                ingredients: recipe.ingredients.map((ri) => ({ ingredientId: ri.ingredientId, quantity: ri.quantity.toString() })),
              }}
              action={action}
              submitLabel="Save changes"
              currency={business.currency}
            />
          </Card>
        </div>

        <Card>
          <CardTitle>Recent production batches</CardTitle>
          {batches.length === 0 ? (
            <EmptyState message="No production recorded yet for this recipe." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Output</Th>
                  <Th>Cost/unit</Th>
                  <Th>Remaining</Th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <Td>{formatDateTime(b.producedAt)}</Td>
                    <Td>{b.actualOutput.toString()}</Td>
                    <Td>{formatMoney(b.costPerUnit.toString(), business.currency)}</Td>
                    <Td>{b.unitsRemaining.toString()}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <div className="mt-4 text-center">
            <Link href="/production" className="text-sm text-zinc-500 hover:text-zinc-900">
              View all production →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
