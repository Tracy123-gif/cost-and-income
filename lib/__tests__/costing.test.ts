import { test } from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";
import {
  calculateUnitCost,
  weightedAverageCost,
  calculateUsageCost,
  calculateBatchCost,
  calculateProfit,
  calculateInventoryBalance,
  InvalidQuantityError,
} from "../services/costing";
import { toBaseUnit, IncompatibleUnitError } from "../units";

test("toBaseUnit converts kg to grams", () => {
  assert.equal(toBaseUnit(50, "KG", "GRAM").toString(), "50000");
});

test("toBaseUnit converts litres to ml", () => {
  assert.equal(toBaseUnit(2, "LITRE", "ML").toString(), "2000");
});

test("toBaseUnit passes through matching units", () => {
  assert.equal(toBaseUnit(10, "PIECE", "PIECE").toString(), "10");
  assert.equal(toBaseUnit(500, "G", "GRAM").toString(), "500");
});

test("toBaseUnit rejects incompatible units", () => {
  assert.throws(() => toBaseUnit(1, "KG", "PIECE"), IncompatibleUnitError);
  assert.throws(() => toBaseUnit(1, "LITRE", "GRAM"), IncompatibleUnitError);
});

test("spec example: 50kg flour for NGN30,000 -> NGN0.60/g, 4000g -> NGN2,400", () => {
  const qtyBase = toBaseUnit(50, "KG", "GRAM");
  const unitCost = calculateUnitCost(30000, qtyBase);
  assert.equal(unitCost.toString(), "0.6");
  const usageCost = calculateUsageCost(4000, unitCost);
  assert.equal(usageCost.toString(), "2400");
});

test("full bread test scenario from spec section 20", () => {
  // Flour: 50kg for 30,000 -> 0.60/g; recipe uses 4000g -> 2400
  const flourUnitCost = calculateUnitCost(30000, toBaseUnit(50, "KG", "GRAM"));
  const flourCost = calculateUsageCost(4000, flourUnitCost);
  assert.equal(flourCost.toString(), "2400");

  // Sugar: 10kg (10,000g) for 20,000 -> 2/g; recipe uses 500g -> 1000
  const sugarUnitCost = calculateUnitCost(20000, toBaseUnit(10, "KG", "GRAM"));
  const sugarCost = calculateUsageCost(500, sugarUnitCost);
  assert.equal(sugarCost.toString(), "1000");

  const ingredientCost = flourCost.add(sugarCost);
  const batch = calculateBatchCost(ingredientCost, 500, 0, 0, 20);
  assert.equal(batch.totalBatchCost.toString(), "3900");
  assert.equal(batch.costPerOutputUnit.toString(), "195");

  const revenue = new Decimal(400).mul(20);
  assert.equal(revenue.toString(), "8000");

  const profit = calculateProfit(revenue, batch.totalBatchCost, 0);
  assert.equal(profit.grossProfit.toString(), "4100");
});

test("weightedAverageCost blends two purchases at different prices", () => {
  // 10,000g on hand at 0.5/g, receive 5,000g at 0.8/g
  const newAvg = weightedAverageCost(10000, 0.5, 5000, 0.8);
  // (10000*0.5 + 5000*0.8) / 15000 = (5000+4000)/15000 = 0.6
  assert.equal(newAvg.toString(), "0.6");
});

test("weightedAverageCost on first purchase (zero stock) uses the incoming cost", () => {
  const newAvg = weightedAverageCost(0, 0, 1000, 1.25);
  assert.equal(newAvg.toString(), "1.25");
});

test("calculateUnitCost rejects zero or negative quantity", () => {
  assert.throws(() => calculateUnitCost(1000, 0), InvalidQuantityError);
  assert.throws(() => calculateUnitCost(1000, -5), InvalidQuantityError);
});

test("calculateBatchCost rejects zero output quantity", () => {
  assert.throws(() => calculateBatchCost(100, 0, 0, 0, 0), InvalidQuantityError);
});

test("changing a later purchase price does not affect a cost already calculated", () => {
  // Simulates: batch cost is computed and stored using the unit cost *at that time*.
  const unitCostAtProductionTime = calculateUnitCost(30000, 50000);
  const historicalBatchCost = calculateUsageCost(4000, unitCostAtProductionTime);

  // Price rises later; this must not retroactively change the number we already stored.
  const newUnitCost = calculateUnitCost(45000, 50000);
  assert.notEqual(newUnitCost.toString(), unitCostAtProductionTime.toString());
  assert.equal(historicalBatchCost.toString(), "2400");
});

test("actual output lower than planned recalculates cost per unit, not ingredient cost", () => {
  const batchWithFullOutput = calculateBatchCost(3400, 500, 0, 0, 20);
  const batchWithReducedOutput = calculateBatchCost(3400, 500, 0, 0, 15);
  assert.equal(batchWithFullOutput.totalBatchCost.toString(), batchWithReducedOutput.totalBatchCost.toString());
  assert.ok(batchWithReducedOutput.costPerOutputUnit.gt(batchWithFullOutput.costPerOutputUnit));
});

test("calculateProfit handles zero revenue without dividing by zero", () => {
  const profit = calculateProfit(0, 0, 500);
  assert.equal(profit.grossMarginPct.toString(), "0");
  assert.equal(profit.operatingProfit.toString(), "-500");
});

test("calculateInventoryBalance applies purchases, consumption and signed adjustments", () => {
  const balance = calculateInventoryBalance(1000, 500, 300, -50);
  assert.equal(balance.toString(), "1150");
});

test("gross margin percentage matches gross profit / revenue", () => {
  const profit = calculateProfit(10000, 6000, 1000);
  assert.equal(profit.grossProfit.toString(), "4000");
  assert.equal(profit.grossMarginPct.toString(), "40");
  assert.equal(profit.operatingProfit.toString(), "3000");
});
