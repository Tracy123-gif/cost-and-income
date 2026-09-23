import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import { listRecipes } from "@/lib/services/recipes";
import { listIngredients } from "@/lib/services/ingredients";
import { formatMoney } from "@/lib/format";
import { Card, CardTitle, PageHeader, LinkButton, Table, Th, Td, EmptyState, Badge } from "@/components/ui";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");
  const { onboarding } = await searchParams;

  const [recipes, ingredients] = await Promise.all([listRecipes(business.id), listIngredients(business.id)]);

  return (
    <div>
      <PageHeader
        title="Recipes / Products"
        description="Define what one batch takes to make. Cost per unit is calculated automatically from your ingredient costs."
        action={
          ingredients.length > 0 ? <LinkButton href="/recipes/new">+ New recipe</LinkButton> : undefined
        }
      />

      {onboarding && recipes.length === 0 && (
        <Card className="mb-6 border-zinc-900/10 bg-zinc-900 text-white">
          <p className="text-sm">Step 2 of 2: create a recipe using the ingredient you just added, then set an output quantity and selling price.</p>
        </Card>
      )}

      {ingredients.length === 0 ? (
        <Card>
          <EmptyState message="Add at least one ingredient before creating a recipe." />
          <div className="flex justify-center">
            <LinkButton href="/ingredients">Go to Ingredients</LinkButton>
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>All recipes</CardTitle>
          {recipes.length === 0 ? (
            <EmptyState message="No recipes yet." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Batch output</Th>
                  <Th>Selling price</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <Link href={`/recipes/${r.id}`} className="font-medium text-zinc-900 hover:underline">
                        {r.productName}
                      </Link>
                      {r.sku && <div className="text-xs text-zinc-400">{r.sku}</div>}
                    </Td>
                    <Td>
                      {r.outputQuantity.toString()} {r.outputUnit}
                    </Td>
                    <Td>{formatMoney(r.sellingPrice.toString(), business.currency)}</Td>
                    <Td>{r.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                    <Td>
                      <Link href={`/recipes/${r.id}`} className="text-zinc-500 hover:text-zinc-900">
                        Edit →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
