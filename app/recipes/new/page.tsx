import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import { listIngredients } from "@/lib/services/ingredients";
import { Card, PageHeader } from "@/components/ui";
import RecipeForm from "../RecipeForm";
import { createRecipeAction } from "../actions";

export default async function NewRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");
  const { onboarding } = await searchParams;

  const ingredients = await listIngredients(business.id);
  if (ingredients.length === 0) redirect("/ingredients");

  async function action(formData: FormData) {
    "use server";
    if (onboarding) formData.set("onboarding", "1");
    await createRecipeAction(formData);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New recipe" description="One batch produces a fixed quantity of finished units." />
      <Card>
        <RecipeForm
          ingredients={ingredients.map((i) => ({
            id: i.id,
            name: i.name,
            baseUnit: i.baseUnit,
            avgCostPerUnit: i.avgCostPerUnit.toString(),
          }))}
          action={action}
          submitLabel="Create recipe"
          currency={business.currency}
        />
      </Card>
    </div>
  );
}
