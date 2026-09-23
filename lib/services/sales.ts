import Decimal from "decimal.js";
import { prisma } from "../prisma";
import { InsufficientStockError, NotFoundError } from "./errors";

export interface SaleItemInput {
  recipeId: string;
  productionBatchId: string;
  quantity: string;
  unitPrice: string;
}

export interface RecordSaleInput {
  businessId: string;
  saleDate?: Date;
  paymentMethod?: "CASH" | "TRANSFER" | "CARD" | "OTHER";
  customerRef?: string;
  discountAmount?: string;
  note?: string;
  items: SaleItemInput[];
  allowNegativeInventory?: boolean;
}

/**
 * SALES step: revenue and COGS are computed straight from each finished-goods production batch's
 * frozen cost-per-unit, so a sale's profit never drifts if ingredient prices change afterwards.
 */
export async function recordSale(input: RecordSaleInput) {
  return prisma.$transaction(async (tx) => {
    const lineItems = [];
    for (const item of input.items) {
      const batch = await tx.productionBatch.findUnique({ where: { id: item.productionBatchId } });
      if (!batch) throw new NotFoundError("ProductionBatch", item.productionBatchId);
      const quantity = new Decimal(item.quantity);
      const remaining = new Decimal(batch.unitsRemaining.toString());
      if (!input.allowNegativeInventory && remaining.lt(quantity)) {
        throw new InsufficientStockError(`finished units of batch ${batch.id}`, remaining.toString(), quantity.toString());
      }
      const unitPrice = new Decimal(item.unitPrice);
      const unitCost = new Decimal(batch.costPerUnit.toString());
      lineItems.push({
        recipeId: item.recipeId,
        productionBatchId: item.productionBatchId,
        quantity,
        unitPrice,
        unitCost,
        lineRevenue: quantity.mul(unitPrice),
        lineCogs: quantity.mul(unitCost),
        newRemaining: remaining.sub(quantity),
      });
    }

    const sale = await tx.sale.create({
      data: {
        businessId: input.businessId,
        saleDate: input.saleDate ?? new Date(),
        paymentMethod: input.paymentMethod ?? "CASH",
        customerRef: input.customerRef,
        discountAmount: input.discountAmount ?? "0",
        note: input.note,
        items: {
          create: lineItems.map((l) => ({
            recipeId: l.recipeId,
            productionBatchId: l.productionBatchId,
            quantity: l.quantity.toString(),
            unitPrice: l.unitPrice.toString(),
            unitCost: l.unitCost.toString(),
            lineRevenue: l.lineRevenue.toString(),
            lineCogs: l.lineCogs.toString(),
          })),
        },
      },
      include: { items: true },
    });

    for (const l of lineItems) {
      await tx.productionBatch.update({
        where: { id: l.productionBatchId },
        data: { unitsRemaining: l.newRemaining.toString() },
      });
    }

    await tx.auditLog.create({
      data: {
        businessId: input.businessId,
        entityType: "Sale",
        entityId: sale.id,
        action: "CREATE",
        afterJson: JSON.stringify(sale),
      },
    });

    return sale;
  });
}

/**
 * Reverses a sale: restores each line's units to its production batch and marks the sale VOIDED
 * so it is excluded from revenue/COGS reporting. We never delete the record (audit trail).
 */
export async function voidSale(saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
    if (!sale) throw new NotFoundError("Sale", saleId);
    if (sale.status !== "COMPLETED") return sale;

    for (const item of sale.items) {
      if (!item.productionBatchId) continue;
      const batch = await tx.productionBatch.findUniqueOrThrow({ where: { id: item.productionBatchId } });
      const restored = new Decimal(batch.unitsRemaining.toString()).add(item.quantity.toString());
      await tx.productionBatch.update({ where: { id: item.productionBatchId }, data: { unitsRemaining: restored.toString() } });
    }

    const updated = await tx.sale.update({ where: { id: saleId }, data: { status: "VOIDED" } });

    await tx.auditLog.create({
      data: {
        businessId: sale.businessId,
        entityType: "Sale",
        entityId: sale.id,
        action: "VOID",
        beforeJson: JSON.stringify(sale),
        afterJson: JSON.stringify(updated),
      },
    });

    return updated;
  });
}

export async function listSales(businessId: string, limit = 50) {
  return prisma.sale.findMany({
    where: { businessId },
    include: { items: { include: { recipe: true } } },
    orderBy: { saleDate: "desc" },
    take: limit,
  });
}
