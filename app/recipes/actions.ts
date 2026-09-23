"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createRecipe, updateRecipe } from "@/lib/services/recipes";
import { requireCurrentBusiness } from "@/lib/current-business";

function parseLines(formData: FormData) {
  const raw = String(formData.get("ingredientsJson") ?? "[]");
  const parsed = JSON.parse(raw) as { ingredientId: string; quantity: string }[];
  return parsed.filter((l) => l.ingredientId && l.quantity && Number(l.quantity) > 0);
}

export async function createRecipeAction(formData: FormData) {
  const business = await requireCurrentBusiness();
  if (!business) throw new Error("No business set up yet");

  const productName = String(formData.get("productName") ?? "").trim();
  if (!productName) throw new Error("Product name is required");

  const recipe = await createRecipe({
    businessId: business.id,
    productName,
    sku: String(formData.get("sku") ?? "").trim() || undefined,
    outputQuantity: String(formData.get("outputQuantity") ?? "1"),
    outputUnit: String(formData.get("outputUnit") ?? "unit").trim() || "unit",
    packagingCost: String(formData.get("packagingCost") ?? "0"),
    directLaborCost: String(formData.get("directLaborCost") ?? "0"),
    otherDirectCost: String(formData.get("otherDirectCost") ?? "0"),
    sellingPrice: String(formData.get("sellingPrice") ?? "0"),
    ingredients: parseLines(formData),
  });

  revalidatePath("/recipes");
  const onboarding = formData.get("onboarding");
  if (onboarding) redirect(`/production?onboarding=1&recipeId=${recipe.id}`);
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipeAction(id: string, formData: FormData) {
  await updateRecipe(id, {
    productName: String(formData.get("productName") ?? "").trim() || undefined,
    sku: String(formData.get("sku") ?? "").trim() || undefined,
    outputQuantity: String(formData.get("outputQuantity") ?? "1"),
    outputUnit: String(formData.get("outputUnit") ?? "unit").trim() || "unit",
    packagingCost: String(formData.get("packagingCost") ?? "0"),
    directLaborCost: String(formData.get("directLaborCost") ?? "0"),
    otherDirectCost: String(formData.get("otherDirectCost") ?? "0"),
    sellingPrice: String(formData.get("sellingPrice") ?? "0"),
    active: formData.get("active") === "on",
    ingredients: parseLines(formData),
  });

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
}
