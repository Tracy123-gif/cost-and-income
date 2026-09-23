import Decimal from "decimal.js";
import { prisma } from "../prisma";
import { calculateBatchCost, calculateUsageCost } from "./costing";
import { InsufficientStockError, NotFoundError } from "./errors";

export interface RecordProductionInput {
  recipeId: string;
  plannedOutput: string;
  actualOutput: string;
  wastageNote?: string;
  notes?: string;
  allowNegativeInventory?: boolean;
  producedAt?: Date;
}

/**
 * PRODUCTION step: scales the recipe's ingredient quantities by (plannedOutput / recipe output),
 * consumes that much of each ingredient at its *current* weighted-average cost, and freezes the
 * resulting batch cost. If actualOutput differs from plannedOutput (spoilage, breakage, a smaller
 * bake), the ingredient cost stays the same but cost-per-unit is recalculated from actualOutput -
 * per spec, we never silently overwrite inventory and always keep the transaction history.
 */
export async function recordProduction(input: RecordProductionInput) {
  return prisma.$transaction(async (tx) => {
    const recipe = await tx.recipe.findUnique({
      where: { id: input.recipeId },
      include: { ingredients: { include: { ingredient: true } } },
    });
    if (!recipe) throw new NotFoundError("Recipe", input.recipeId);

    const plannedOutput = new Decimal(input.plannedOutput);
    const actualOutput = new Decimal(input.actualOutput);
    const scale = plannedOutput.div(recipe.outputQuantity.toString());

    const consumptions: { ingredientId: string; name: string; quantity: Decimal; unitCost: Decimal; cost: Decimal }[] = [];
    for (const ri of recipe.ingredients) {
      const quantity = new Decimal(ri.quantity.toString()).mul(scale);
      const ingredient = ri.ingredient;
      const available = new Decimal(ingredient.currentStock.toString());
      if (!input.allowNegativeInventory && available.lt(quantity)) {
        throw new InsufficientStockError(ingredient.name, available.toString(), quantity.toString());
      }
      const unitCost = new Decimal(ingredient.avgCostPerUnit.toString());
      consumptions.push({ ingredientId: ri.ingredientId, name: ingredient.name, quantity, unitCost, cost: calculateUsageCost(quantity, unitCost) });
    }

    const ingredientCost = consumptions.reduce((sum, c) => sum.add(c.cost), new Decimal(0));
    const packagingCost = new Decimal(recipe.packagingCost.toString()).mul(scale);
    const laborCost = new Decimal(recipe.directLaborCost.toString()).mul(scale);
    const otherCost = new Decimal(recipe.otherDirectCost.toString()).mul(scale);
    const breakdown = calculateBatchCost(ingredientCost, packagingCost, laborCost, otherCost, actualOutput);

    const batch = await tx.productionBatch.create({
      data: {
        recipeId: input.recipeId,
        producedAt: input.producedAt ?? new Date(),
        plannedOutput: plannedOutput.toString(),
        actualOutput: actualOutput.toString(),
        ingredientCost: breakdown.ingredientCost.toString(),
        packagingCost: breakdown.packagingCost.toString(),
        laborCost: breakdown.laborCost.toString(),
        otherCost: breakdown.otherCost.toString(),
        totalBatchCost: breakdown.totalBatchCost.toString(),
        costPerUnit: breakdown.costPerOutputUnit.toString(),
        unitsRemaining: actualOutput.toString(),
        wastageNote: input.wastageNote,
        notes: input.notes,
      },
    });

    for (const c of consumptions) {
      const ingredient = await tx.ingredient.findUniqueOrThrow({ where: { id: c.ingredientId } });
      const newStock = new Decimal(ingredient.currentStock.toString()).sub(c.quantity);

      const consumption = await tx.productionConsumption.create({
        data: {
          productionBatchId: batch.id,
          ingredientId: c.ingredientId,
          quantityConsumed: c.quantity.toString(),
          unitCostAtTime: c.unitCost.toString(),
          costAtTime: c.cost.toString(),
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          ingredientId: c.ingredientId,
          type: "PRODUCTION_CONSUMPTION",
          quantity: c.quantity.neg().toString(),
          balanceAfter: newStock.toString(),
          unitCostAtTime: c.unitCost.toString(),
          productionConsumptionId: consumption.id,
        },
      });

      await tx.ingredient.update({ where: { id: c.ingredientId }, data: { currentStock: newStock.toString() } });
    }

    await tx.auditLog.create({
      data: {
        businessId: recipe.businessId,
        entityType: "ProductionBatch",
        entityId: batch.id,
        action: "CREATE",
        afterJson: JSON.stringify({ ...batch, totalBatchCost: breakdown.totalBatchCost.toString() }),
      },
    });

    return tx.productionBatch.findUniqueOrThrow({
      where: { id: batch.id },
      include: { consumptions: { include: { ingredient: true } }, recipe: true },
    });
  });
}

export async function listProductionBatches(businessId: string, limit = 50) {
  return prisma.productionBatch.findMany({
    where: { recipe: { businessId } },
    include: { recipe: true },
    orderBy: { producedAt: "desc" },
    take: limit,
  });
}

export async function getAvailableBatchesForRecipe(recipeId: string) {
  return prisma.productionBatch.findMany({
    where: { recipeId, unitsRemaining: { gt: 0 } },
    orderBy: { producedAt: "asc" },
  });
}
