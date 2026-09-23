import Decimal from "decimal.js";
import { prisma } from "../prisma";
import { calculateProfit } from "./costing";

export type PeriodKey = "today" | "yesterday" | "7d" | "30d" | "mtd" | "custom";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolvePeriod(period: PeriodKey, custom?: { from: string; to: string }): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "7d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "30d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "mtd": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "custom":
      if (!custom) throw new Error("custom period requires from/to");
      return { from: startOfDay(new Date(custom.from)), to: endOfDay(new Date(custom.to)) };
  }
}

async function getSaleItemsInRange(businessId: string, from: Date, to: Date) {
  return prisma.saleItem.findMany({
    where: {
      sale: { businessId, status: "COMPLETED", saleDate: { gte: from, lte: to } },
    },
    include: { recipe: true, sale: true },
  });
}

export async function getProfitAndLoss(businessId: string, from: Date, to: Date) {
  const [items, expenses] = await Promise.all([
    getSaleItemsInRange(businessId, from, to),
    prisma.expense.findMany({ where: { businessId, expenseDate: { gte: from, lte: to } } }),
  ]);

  const revenue = items.reduce((sum, i) => sum.add(i.lineRevenue.toString()), new Decimal(0));
  const cogs = items.reduce((sum, i) => sum.add(i.lineCogs.toString()), new Decimal(0));
  const discounts = await prisma.sale.findMany({
    where: { businessId, status: "COMPLETED", saleDate: { gte: from, lte: to } },
    select: { discountAmount: true },
  });
  const totalDiscount = discounts.reduce((sum, s) => sum.add(s.discountAmount.toString()), new Decimal(0));
  const netRevenue = revenue.sub(totalDiscount);
  const operatingExpenses = expenses.reduce((sum, e) => sum.add(e.amount.toString()), new Decimal(0));
  const unitsSold = items.reduce((sum, i) => sum.add(i.quantity.toString()), new Decimal(0));

  const profit = calculateProfit(netRevenue, cogs, operatingExpenses);
  return { ...profit, unitsSold, discounts: totalDiscount, saleItemCount: items.length };
}

export async function getInventoryValuation(businessId: string) {
  const ingredients = await prisma.ingredient.findMany({ where: { businessId, active: true } });
  let totalValue = new Decimal(0);
  const lines = ingredients.map((ing) => {
    const value = new Decimal(ing.currentStock.toString()).mul(ing.avgCostPerUnit.toString());
    totalValue = totalValue.add(value);
    return {
      ingredientId: ing.id,
      name: ing.name,
      baseUnit: ing.baseUnit,
      currentStock: new Decimal(ing.currentStock.toString()),
      avgCostPerUnit: new Decimal(ing.avgCostPerUnit.toString()),
      value,
      lowStock: new Decimal(ing.currentStock.toString()).lte(ing.minStockLevel.toString()),
    };
  });
  return { totalValue, lines };
}

export async function getTopProducts(businessId: string, from: Date, to: Date, limit = 10) {
  const items = await getSaleItemsInRange(businessId, from, to);
  const byRecipe = new Map<string, { name: string; revenue: Decimal; cogs: Decimal; unitsSold: Decimal }>();
  for (const item of items) {
    const key = item.recipeId;
    const entry = byRecipe.get(key) ?? { name: item.recipe.productName, revenue: new Decimal(0), cogs: new Decimal(0), unitsSold: new Decimal(0) };
    entry.revenue = entry.revenue.add(item.lineRevenue.toString());
    entry.cogs = entry.cogs.add(item.lineCogs.toString());
    entry.unitsSold = entry.unitsSold.add(item.quantity.toString());
    byRecipe.set(key, entry);
  }
  return Array.from(byRecipe.entries())
    .map(([recipeId, v]) => ({ recipeId, ...v, grossProfit: v.revenue.sub(v.cogs) }))
    .sort((a, b) => b.grossProfit.cmp(a.grossProfit))
    .slice(0, limit);
}

export async function getIngredientCostChanges(businessId: string, limit = 10) {
  const ingredients = await prisma.ingredient.findMany({
    where: { businessId, active: true },
    include: { purchases: { orderBy: { purchaseDate: "desc" }, take: 2 } },
  });
  return ingredients
    .filter((ing) => ing.purchases.length >= 2)
    .map((ing) => {
      const [latest, previous] = ing.purchases;
      const latestCost = new Decimal(latest.unitCost.toString());
      const previousCost = new Decimal(previous.unitCost.toString());
      const changePct = previousCost.isZero() ? new Decimal(0) : latestCost.sub(previousCost).div(previousCost).mul(100);
      return { ingredientId: ing.id, name: ing.name, baseUnit: ing.baseUnit, latestCost, previousCost, changePct };
    })
    .sort((a, b) => b.changePct.abs().cmp(a.changePct.abs()))
    .slice(0, limit);
}

export async function getProfitTrend(businessId: string, from: Date, to: Date) {
  const items = await getSaleItemsInRange(businessId, from, to);
  const byDay = new Map<string, { revenue: Decimal; cogs: Decimal }>();
  for (const item of items) {
    const key = startOfDay(item.sale.saleDate).toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { revenue: new Decimal(0), cogs: new Decimal(0) };
    entry.revenue = entry.revenue.add(item.lineRevenue.toString());
    entry.cogs = entry.cogs.add(item.lineCogs.toString());
    byDay.set(key, entry);
  }
  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, revenue: v.revenue, grossProfit: v.revenue.sub(v.cogs) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getProductProfitabilityReport(businessId: string) {
  const recipes = await prisma.recipe.findMany({
    where: { businessId },
    include: { productionBatches: { orderBy: { producedAt: "desc" }, take: 1 } },
  });
  return recipes.map((r) => {
    const latestBatch = r.productionBatches[0];
    const unitCost = latestBatch ? new Decimal(latestBatch.costPerUnit.toString()) : new Decimal(0);
    const sellingPrice = new Decimal(r.sellingPrice.toString());
    const grossProfit = sellingPrice.sub(unitCost);
    const marginPct = sellingPrice.isZero() ? new Decimal(0) : grossProfit.div(sellingPrice).mul(100);
    return { recipeId: r.id, name: r.productName, sellingPrice, unitCost, grossProfit, marginPct, hasProduction: Boolean(latestBatch) };
  });
}

export async function getIngredientUsageReport(businessId: string, from: Date, to: Date) {
  const consumptions = await prisma.productionConsumption.findMany({
    where: { productionBatch: { producedAt: { gte: from, lte: to }, recipe: { businessId } } },
    include: { ingredient: true },
  });
  const byIngredient = new Map<string, { name: string; baseUnit: string; quantity: Decimal; cost: Decimal }>();
  for (const c of consumptions) {
    const entry = byIngredient.get(c.ingredientId) ?? { name: c.ingredient.name, baseUnit: c.ingredient.baseUnit, quantity: new Decimal(0), cost: new Decimal(0) };
    entry.quantity = entry.quantity.add(c.quantityConsumed.toString());
    entry.cost = entry.cost.add(c.costAtTime.toString());
    byIngredient.set(c.ingredientId, entry);
  }
  return Array.from(byIngredient.entries()).map(([ingredientId, v]) => ({ ingredientId, ...v }));
}

export async function getProductionReport(businessId: string, from: Date, to: Date) {
  return prisma.productionBatch.findMany({
    where: { recipe: { businessId }, producedAt: { gte: from, lte: to } },
    include: { recipe: true },
    orderBy: { producedAt: "desc" },
  });
}

export async function getSalesReport(businessId: string, from: Date, to: Date) {
  return prisma.sale.findMany({
    where: { businessId, saleDate: { gte: from, lte: to } },
    include: { items: { include: { recipe: true } } },
    orderBy: { saleDate: "desc" },
  });
}

export async function getExpenseReport(businessId: string, from: Date, to: Date) {
  const expenses = await prisma.expense.findMany({
    where: { businessId, expenseDate: { gte: from, lte: to } },
    orderBy: { expenseDate: "desc" },
  });
  const byCategory = new Map<string, Decimal>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? new Decimal(0)).add(e.amount.toString()));
  }
  return {
    expenses,
    total: expenses.reduce((sum, e) => sum.add(e.amount.toString()), new Decimal(0)),
    byCategory: Array.from(byCategory.entries()).map(([category, total]) => ({ category, total })),
  };
}

export async function getWastageReport(businessId: string, from: Date, to: Date) {
  return prisma.inventoryTransaction.findMany({
    where: {
      ingredient: { businessId },
      type: { in: ["WASTAGE", "ADJUSTMENT"] },
      createdAt: { gte: from, lte: to },
    },
    include: { ingredient: true },
    orderBy: { createdAt: "desc" },
  });
}
