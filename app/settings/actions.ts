"use server";

import { revalidatePath } from "next/cache";
import { updateBusiness } from "@/lib/services/business";

export async function updateBusinessAction(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  await updateBusiness(id, {
    name: name || undefined,
    currency: currency || undefined,
    timezone: timezone || undefined,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
