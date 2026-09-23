"use server";

import { revalidatePath } from "next/cache";
import type { PurchaseUnit } from "@prisma/client";
import { recordPurchase } from "@/lib/services/purchases";

export async function recordPurchaseAction(formData: FormData) {
  const ingredientId = String(formData.get("ingredientId") ?? "");
  const packageQuantity = String(formData.get("packageQuantity") ?? "");
  const packageUnit = String(formData.get("packageUnit") ?? "") as PurchaseUnit;
  const totalPrice = String(formData.get("totalPrice") ?? "");
  const supplierId = String(formData.get("supplierId") ?? "") || undefined;
  const note = String(formData.get("note") ?? "").trim();
  const purchaseDateRaw = String(formData.get("purchaseDate") ?? "");

  if (!ingredientId || !packageQuantity || !packageUnit || !totalPrice) {
    throw new Error("Ingredient, quantity, unit and price are all required");
  }

  await recordPurchase({
    ingredientId,
    packageQuantity,
    packageUnit,
    totalPrice,
    supplierId,
    note: note || undefined,
    purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
  });

  revalidatePath("/purchases");
  revalidatePath("/ingredients");
  revalidatePath(`/ingredients/${ingredientId}`);
}
