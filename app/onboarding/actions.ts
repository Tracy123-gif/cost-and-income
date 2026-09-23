"use server";

import { redirect } from "next/navigation";
import { createBusiness } from "@/lib/services/business";

export async function createBusinessAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "NGN").trim() || "NGN";
  if (!name) {
    throw new Error("Business name is required");
  }
  await createBusiness({ name, currency });
  redirect("/ingredients?onboarding=1");
}
