"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordProduction } from "@/lib/services/production";

export async function recordProductionAction(formData: FormData) {
  const recipeId = String(formData.get("recipeId") ?? "");
  const plannedOutput = String(formData.get("plannedOutput") ?? "");
  const actualOutput = String(formData.get("actualOutput") ?? "");
  const wastageNote = String(formData.get("wastageNote") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const allowNegativeInventory = formData.get("allowNegativeInventory") === "on";

  if (!recipeId || !plannedOutput || !actualOutput) {
    throw new Error("Recipe, planned output and actual output are required");
  }

  await recordProduction({
    recipeId,
    plannedOutput,
    actualOutput,
    wastageNote: wastageNote || undefined,
    notes: notes || undefined,
    allowNegativeInventory,
  });

  revalidatePath("/production");
  revalidatePath("/ingredients");
  revalidatePath("/dashboard");
  const onboarding = formData.get("onboarding");
  if (onboarding) redirect("/sales?onboarding=1");
}
