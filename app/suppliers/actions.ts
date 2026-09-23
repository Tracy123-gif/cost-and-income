"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentBusiness } from "@/lib/current-business";

export async function createSupplierAction(formData: FormData) {
  const business = await requireCurrentBusiness();
  if (!business) throw new Error("No business set up yet");

  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  if (!name) throw new Error("Supplier name is required");

  await prisma.supplier.create({ data: { businessId: business.id, name, contact: contact || undefined } });
  revalidatePath("/suppliers");
}

export async function toggleSupplierActiveAction(id: string, active: boolean) {
  await prisma.supplier.update({ where: { id }, data: { active } });
  revalidatePath("/suppliers");
}
