"use server";

import { revalidatePath } from "next/cache";
import { recordExpense } from "@/lib/services/expenses";
import { requireCurrentBusiness } from "@/lib/current-business";

export async function recordExpenseAction(formData: FormData) {
  const business = await requireCurrentBusiness();
  if (!business) throw new Error("No business set up yet");

  const category = String(formData.get("category") ?? "").trim();
  const amount = String(formData.get("amount") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const expenseDateRaw = String(formData.get("expenseDate") ?? "");

  if (!category || !amount) throw new Error("Category and amount are required");

  await recordExpense({
    businessId: business.id,
    category,
    amount,
    note: note || undefined,
    expenseDate: expenseDateRaw ? new Date(expenseDateRaw) : undefined,
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
