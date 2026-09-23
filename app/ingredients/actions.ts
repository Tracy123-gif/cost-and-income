"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BaseUnit, PurchaseUnit } from "@prisma/client";
import { createIngredient, updateIngredient } from "@/lib/services/ingredients";
import { recordInventoryAdjustment } from "@/lib/services/inventory";
import { recordPurchase } from "@/lib/services/purchases";
import { requireCurrentBusiness } from "@/lib/current-business";

export async function createIngredientAction(formData: FormData) {
  const business = await requireCurrentBusiness();
  if (!business) throw new Error("No business set up yet");

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const baseUnit = String(formData.get("baseUnit") ?? "GRAM") as BaseUnit;
  const minStockLevel = String(formData.get("minStockLevel") ?? "0") || "0";

  if (!name) throw new Error("Ingredient name is required");

  const ingredient = await createIngredient({
    businessId: business.id,
    name,
    category: category || undefined,
    baseUnit,
    minStockLevel,
  });

  // Optional "record what you already have" fields on the same form - both must be
  // filled in to count as a real purchase, so a stray "50" in one box with the other
  // left blank doesn't silently create a purchase at ₦0 or for a phantom quantity.
  const packageQuantity = String(formData.get("packageQuantity") ?? "").trim();
  const totalPrice = String(formData.get("totalPrice") ?? "").trim();
  const packageUnit = String(formData.get("packageUnit") ?? "") as PurchaseUnit;
  if (packageQuantity && totalPrice && Number(packageQuantity) > 0) {
    await recordPurchase({
      ingredientId: ingredient.id,
      packageQuantity,
      packageUnit,
      totalPrice,
    });
  }

  revalidatePath("/ingredients");
  const onboarding = formData.get("onboarding");
  if (onboarding) redirect("/recipes?onboarding=1");
}

export async function updateIngredientAction(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const minStockLevel = String(formData.get("minStockLevel") ?? "0") || "0";
  const active = formData.get("active") === "on";

  await updateIngredient(id, {
    name: name || undefined,
    category: category || null,
    minStockLevel,
    active,
  });

  revalidatePath("/ingredients");
  revalidatePath(`/ingredients/${id}`);
}

export async function recordAdjustmentAction(ingredientId: string, formData: FormData) {
  const quantityDelta = String(formData.get("quantityDelta") ?? "");
  const type = String(formData.get("type") ?? "ADJUSTMENT") as "WASTAGE" | "ADJUSTMENT";
  const note = String(formData.get("note") ?? "").trim();

  if (!quantityDelta) throw new Error("Quantity is required");

  await recordInventoryAdjustment({
    ingredientId,
    quantityDelta: type === "WASTAGE" ? `-${Math.abs(Number(quantityDelta))}` : quantityDelta,
    type,
    note: note || undefined,
  });

  revalidatePath(`/ingredients/${ingredientId}`);
  revalidatePath("/ingredients");
}
