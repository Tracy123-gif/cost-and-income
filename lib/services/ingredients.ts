import { prisma } from "../prisma";
import type { BaseUnit } from "@prisma/client";
import { NotFoundError } from "./errors";

export async function listIngredients(businessId: string, { includeInactive = false }: { includeInactive?: boolean } = {}) {
  return prisma.ingredient.findMany({
    where: { businessId, ...(includeInactive ? {} : { active: true }) },
    orderBy: { name: "asc" },
  });
}

export async function getIngredient(id: string) {
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient) throw new NotFoundError("Ingredient", id);
  return ingredient;
}

export async function createIngredient(input: {
  businessId: string;
  name: string;
  category?: string;
  baseUnit: BaseUnit;
  minStockLevel?: string;
}) {
  return prisma.ingredient.create({
    data: {
      businessId: input.businessId,
      name: input.name,
      category: input.category,
      baseUnit: input.baseUnit,
      minStockLevel: input.minStockLevel ?? "0",
    },
  });
}

export async function updateIngredient(
  id: string,
  input: { name?: string; category?: string | null; minStockLevel?: string; active?: boolean },
) {
  return prisma.ingredient.update({ where: { id }, data: input });
}

export async function getLowStockIngredients(businessId: string) {
  const ingredients = await prisma.ingredient.findMany({ where: { businessId, active: true } });
  return ingredients.filter((i) => Number(i.currentStock) <= Number(i.minStockLevel));
}
