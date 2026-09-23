"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";
import { recordSale, voidSale } from "@/lib/services/sales";
import { requireCurrentBusiness } from "@/lib/current-business";

export async function recordSaleAction(formData: FormData) {
  const business = await requireCurrentBusiness();
  if (!business) throw new Error("No business set up yet");

  const itemsRaw = String(formData.get("itemsJson") ?? "[]");
  const items = JSON.parse(itemsRaw) as {
    recipeId: string;
    productionBatchId: string;
    quantity: string;
    unitPrice: string;
  }[];
  const validItems = items.filter((i) => i.recipeId && i.productionBatchId && Number(i.quantity) > 0);
  if (validItems.length === 0) throw new Error("Add at least one item to the sale");

  const paymentMethod = String(formData.get("paymentMethod") ?? "CASH") as PaymentMethod;
  const customerRef = String(formData.get("customerRef") ?? "").trim();
  const discountAmount = String(formData.get("discountAmount") ?? "0") || "0";
  const note = String(formData.get("note") ?? "").trim();
  const saleDateRaw = String(formData.get("saleDate") ?? "");

  await recordSale({
    businessId: business.id,
    paymentMethod,
    customerRef: customerRef || undefined,
    discountAmount,
    note: note || undefined,
    saleDate: saleDateRaw ? new Date(saleDateRaw) : undefined,
    items: validItems,
  });

  revalidatePath("/sales");
  revalidatePath("/production");
  revalidatePath("/dashboard");

  if (formData.get("onboarding")) redirect("/dashboard?onboarding=complete");
}

export async function voidSaleAction(saleId: string) {
  await voidSale(saleId);
  revalidatePath("/sales");
  revalidatePath("/production");
  revalidatePath("/dashboard");
}
