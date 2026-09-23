import type { PurchaseUnit } from "@prisma/client";
import { prisma } from "../prisma";
import { toBaseUnit } from "../units";
import { calculateUnitCost, weightedAverageCost } from "./costing";

export interface RecordPurchaseInput {
  ingredientId: string;
  supplierId?: string | null;
  purchaseDate?: Date;
  packageQuantity: string;
  packageUnit: PurchaseUnit;
  totalPrice: string;
  note?: string;
}

/**
 * PURCHASE -> STANDARDIZE -> INVENTORY: converts the purchased package into the ingredient's
 * base unit, derives the per-base-unit cost, folds it into the ingredient's weighted-average
 * cost, and records both the purchase and the resulting inventory transaction atomically.
 */
export async function recordPurchase(input: RecordPurchaseInput) {
  return prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.findUniqueOrThrow({ where: { id: input.ingredientId } });

    const quantityInBaseUnit = toBaseUnit(input.packageQuantity, input.packageUnit, ingredient.baseUnit);
    const unitCost = calculateUnitCost(input.totalPrice, quantityInBaseUnit);
    const newAvgCost = weightedAverageCost(
      ingredient.currentStock.toString(),
      ingredient.avgCostPerUnit.toString(),
      quantityInBaseUnit,
      unitCost,
    );
    const newStock = quantityInBaseUnit.add(ingredient.currentStock.toString());

    const purchase = await tx.purchase.create({
      data: {
        ingredientId: input.ingredientId,
        supplierId: input.supplierId ?? undefined,
        purchaseDate: input.purchaseDate ?? new Date(),
        packageQuantity: input.packageQuantity,
        packageUnit: input.packageUnit,
        quantityInBaseUnit: quantityInBaseUnit.toString(),
        totalPrice: input.totalPrice,
        unitCost: unitCost.toString(),
        note: input.note,
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        ingredientId: input.ingredientId,
        type: "PURCHASE",
        quantity: quantityInBaseUnit.toString(),
        balanceAfter: newStock.toString(),
        unitCostAtTime: unitCost.toString(),
        purchaseId: purchase.id,
      },
    });

    const updatedIngredient = await tx.ingredient.update({
      where: { id: input.ingredientId },
      data: { currentStock: newStock.toString(), avgCostPerUnit: newAvgCost.toString() },
    });

    await tx.auditLog.create({
      data: {
        businessId: ingredient.businessId,
        entityType: "Purchase",
        entityId: purchase.id,
        action: "CREATE",
        afterJson: JSON.stringify({ ...purchase, unitCost: unitCost.toString() }),
      },
    });

    return { purchase, ingredient: updatedIngredient };
  });
}

export async function listPurchases(businessId: string, limit = 50) {
  return prisma.purchase.findMany({
    where: { ingredient: { businessId } },
    include: { ingredient: true, supplier: true },
    orderBy: { purchaseDate: "desc" },
    take: limit,
  });
}
