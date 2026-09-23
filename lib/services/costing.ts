import Decimal from "decimal.js";

export class InvalidQuantityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidQuantityError";
  }
}

function assertPositive(value: Decimal, label: string) {
  if (value.isNaN() || value.lte(0)) {
    throw new InvalidQuantityError(`${label} must be a positive number`);
  }
}

/**
 * Cost per base unit = purchase price / total purchase quantity in base units.
 */
export function calculateUnitCost(totalPrice: Decimal.Value, quantityInBaseUnit: Decimal.Value): Decimal {
  const price = new Decimal(totalPrice);
  const qty = new Decimal(quantityInBaseUnit);
  assertPositive(qty, "Purchase quantity");
  if (price.isNaN() || price.lt(0)) {
    throw new InvalidQuantityError("Purchase price must be zero or a positive number");
  }
  return price.div(qty);
}

/**
 * Weighted-average cost after receiving new stock:
 * newAvg = (existingStock * existingAvg + incomingQty * incomingUnitCost) / (existingStock + incomingQty)
 */
export function weightedAverageCost(
  existingStock: Decimal.Value,
  existingAvgCost: Decimal.Value,
  incomingQty: Decimal.Value,
  incomingUnitCost: Decimal.Value,
): Decimal {
  const stock = new Decimal(existingStock);
  const avg = new Decimal(existingAvgCost);
  const qty = new Decimal(incomingQty);
  const unitCost = new Decimal(incomingUnitCost);
  const newStock = stock.add(qty);
  if (newStock.lte(0)) {
    return unitCost;
  }
  return stock.mul(avg).add(qty.mul(unitCost)).div(newStock);
}

/**
 * Ingredient usage cost = quantity used * cost per base unit.
 */
export function calculateUsageCost(quantityUsed: Decimal.Value, costPerBaseUnit: Decimal.Value): Decimal {
  return new Decimal(quantityUsed).mul(costPerBaseUnit);
}

export interface RecipeCostBreakdown {
  ingredientCost: Decimal;
  packagingCost: Decimal;
  laborCost: Decimal;
  otherCost: Decimal;
  totalBatchCost: Decimal;
  costPerOutputUnit: Decimal;
}

/**
 * Recipe batch cost = sum of ingredient usage costs + packaging + labor + other direct costs.
 * Cost per output unit = total batch cost / quantity produced.
 */
export function calculateBatchCost(
  ingredientCost: Decimal.Value,
  packagingCost: Decimal.Value,
  laborCost: Decimal.Value,
  otherCost: Decimal.Value,
  outputQuantity: Decimal.Value,
): RecipeCostBreakdown {
  const output = new Decimal(outputQuantity);
  assertPositive(output, "Output quantity");
  const total = new Decimal(ingredientCost).add(packagingCost).add(laborCost).add(otherCost);
  return {
    ingredientCost: new Decimal(ingredientCost),
    packagingCost: new Decimal(packagingCost),
    laborCost: new Decimal(laborCost),
    otherCost: new Decimal(otherCost),
    totalBatchCost: total,
    costPerOutputUnit: total.div(output),
  };
}

export interface ProfitSummary {
  revenue: Decimal;
  cogs: Decimal;
  grossProfit: Decimal;
  operatingExpenses: Decimal;
  operatingProfit: Decimal;
  grossMarginPct: Decimal;
}

/**
 * Gross profit = revenue - COGS. Operating profit = gross profit - operating expenses.
 * Gross margin % = gross profit / revenue * 100 (0 when there is no revenue, to avoid divide-by-zero).
 */
export function calculateProfit(
  revenue: Decimal.Value,
  cogs: Decimal.Value,
  operatingExpenses: Decimal.Value,
): ProfitSummary {
  const rev = new Decimal(revenue);
  const cost = new Decimal(cogs);
  const grossProfit = rev.sub(cost);
  const expenses = new Decimal(operatingExpenses);
  const operatingProfit = grossProfit.sub(expenses);
  const grossMarginPct = rev.isZero() ? new Decimal(0) : grossProfit.div(rev).mul(100);
  return {
    revenue: rev,
    cogs: cost,
    grossProfit,
    operatingExpenses: expenses,
    operatingProfit,
    grossMarginPct,
  };
}

/**
 * Inventory remaining = opening quantity + purchases - production consumption +/- adjustments.
 * `adjustments` is a signed delta: negative for wastage/shrinkage, positive for stock found on a
 * physical count. In practice we track a running balance per InventoryTransaction, so this helper
 * is used for verifying/reconciling a ledger rather than as the primary source of truth.
 */
export function calculateInventoryBalance(
  opening: Decimal.Value,
  purchases: Decimal.Value,
  consumption: Decimal.Value,
  adjustments: Decimal.Value,
): Decimal {
  return new Decimal(opening).add(purchases).sub(consumption).add(adjustments);
}
