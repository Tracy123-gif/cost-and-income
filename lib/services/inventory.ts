import Decimal from "decimal.js";
import { prisma } from "../prisma";
import { NotFoundError } from "./errors";

export interface RecordAdjustmentInput {
  ingredientId: string;
  /** Signed quantity in the ingredient's base unit: negative for wastage/shrinkage, positive for a physical-count correction that finds more stock than recorded. */
  quantityDelta: string;
  type: "WASTAGE" | "ADJUSTMENT";
  note?: string;
}

/**
 * Records wastage/spoilage or a stock-count correction directly against the inventory ledger,
 * without going through a purchase or production event. Never mutates avgCostPerUnit - only
 * purchases change the weighted average.
 */
export async function recordInventoryAdjustment(input: RecordAdjustmentInput) {
  return prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.findUnique({ where: { id: input.ingredientId } });
    if (!ingredient) throw new NotFoundError("Ingredient", input.ingredientId);

    const delta = new Decimal(input.quantityDelta);
    const newStock = new Decimal(ingredient.currentStock.toString()).add(delta);

    await tx.inventoryTransaction.create({
      data: {
        ingredientId: input.ingredientId,
        type: input.type,
        quantity: delta.toString(),
        balanceAfter: newStock.toString(),
        unitCostAtTime: ingredient.avgCostPerUnit.toString(),
        note: input.note,
      },
    });

    const updated = await tx.ingredient.update({
      where: { id: input.ingredientId },
      data: { currentStock: newStock.toString() },
    });

    await tx.auditLog.create({
      data: {
        businessId: ingredient.businessId,
        entityType: "Ingredient",
        entityId: ingredient.id,
        action: input.type,
        beforeJson: JSON.stringify({ currentStock: ingredient.currentStock.toString() }),
        afterJson: JSON.stringify({ currentStock: updated.currentStock.toString() }),
      },
    });

    return updated;
  });
}

export async function listInventoryTransactions(ingredientId: string, limit = 50) {
  return prisma.inventoryTransaction.findMany({
    where: { ingredientId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
