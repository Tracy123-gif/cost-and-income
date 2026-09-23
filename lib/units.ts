import Decimal from "decimal.js";
import type { BaseUnit, PurchaseUnit } from "@prisma/client";

/**
 * Every measurement type has exactly one base unit: weight -> gram, volume -> millilitre,
 * count -> piece. All costing math happens in base units so we never mix kg and g internally.
 */
export const BASE_UNIT_LABEL: Record<BaseUnit, string> = {
  GRAM: "g",
  ML: "ml",
  PIECE: "pcs",
};

export const PURCHASE_UNIT_LABEL: Record<PurchaseUnit, string> = {
  KG: "kg",
  G: "g",
  LITRE: "L",
  ML: "ml",
  PIECE: "pcs",
};

const COMPATIBLE_PURCHASE_UNITS: Record<BaseUnit, PurchaseUnit[]> = {
  GRAM: ["KG", "G"],
  ML: ["LITRE", "ML"],
  PIECE: ["PIECE"],
};

export function compatiblePurchaseUnits(baseUnit: BaseUnit): PurchaseUnit[] {
  return COMPATIBLE_PURCHASE_UNITS[baseUnit];
}

export class IncompatibleUnitError extends Error {
  constructor(baseUnit: BaseUnit, purchaseUnit: PurchaseUnit) {
    super(`Cannot record a ${purchaseUnit} purchase for an ingredient measured in ${baseUnit}`);
    this.name = "IncompatibleUnitError";
  }
}

/**
 * Converts a purchased quantity (e.g. 50 KG) into the ingredient's base unit (e.g. 50000 GRAM).
 * This is the "STANDARDIZE" step: the user never has to do this arithmetic themselves.
 */
export function toBaseUnit(quantity: Decimal.Value, purchaseUnit: PurchaseUnit, baseUnit: BaseUnit): Decimal {
  const qty = new Decimal(quantity);
  if (!compatiblePurchaseUnits(baseUnit).includes(purchaseUnit)) {
    throw new IncompatibleUnitError(baseUnit, purchaseUnit);
  }
  switch (purchaseUnit) {
    case "KG":
      return qty.mul(1000);
    case "LITRE":
      return qty.mul(1000);
    case "G":
    case "ML":
    case "PIECE":
      return qty;
  }
}

export function formatQuantity(value: Decimal.Value, baseUnit: BaseUnit): string {
  const qty = new Decimal(value);
  if (baseUnit === "GRAM" && qty.abs().gte(1000)) {
    return `${qty.div(1000).toDecimalPlaces(3).toString()} kg`;
  }
  if (baseUnit === "ML" && qty.abs().gte(1000)) {
    return `${qty.div(1000).toDecimalPlaces(3).toString()} L`;
  }
  return `${qty.toDecimalPlaces(2).toString()} ${BASE_UNIT_LABEL[baseUnit]}`;
}
