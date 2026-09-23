import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { toBaseUnit } from "../lib/units";
import { calculateUnitCost, weightedAverageCost } from "../lib/services/costing";

const prisma = new PrismaClient();

async function purchaseIngredient(
  ingredientId: string,
  baseUnit: "GRAM" | "ML" | "PIECE",
  packageQuantity: number,
  packageUnit: "KG" | "G" | "LITRE" | "ML" | "PIECE",
  totalPrice: number,
  supplierId?: string,
) {
  const ingredient = await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
  const qtyBase = toBaseUnit(packageQuantity, packageUnit, baseUnit);
  const unitCost = calculateUnitCost(totalPrice, qtyBase);
  const newAvg = weightedAverageCost(ingredient.currentStock.toString(), ingredient.avgCostPerUnit.toString(), qtyBase, unitCost);
  const newStock = new Decimal(ingredient.currentStock.toString()).add(qtyBase);

  const purchase = await prisma.purchase.create({
    data: {
      ingredientId,
      supplierId,
      packageQuantity: packageQuantity.toString(),
      packageUnit,
      quantityInBaseUnit: qtyBase.toString(),
      totalPrice: totalPrice.toString(),
      unitCost: unitCost.toString(),
    },
  });

  await prisma.inventoryTransaction.create({
    data: {
      ingredientId,
      type: "PURCHASE",
      quantity: qtyBase.toString(),
      balanceAfter: newStock.toString(),
      unitCostAtTime: unitCost.toString(),
      purchaseId: purchase.id,
    },
  });

  await prisma.ingredient.update({
    where: { id: ingredientId },
    data: { currentStock: newStock.toString(), avgCostPerUnit: newAvg.toString() },
  });
}

async function main() {
  console.log("Seeding demo data...");

  const business = await prisma.business.create({
    data: { name: "Demo Parfait & Bakery Co.", currency: "NGN", timezone: "Africa/Lagos" },
  });

  const supplier = await prisma.supplier.create({
    data: { businessId: business.id, name: "Mainland Wholesale Market", contact: "0803 000 0000" },
  });

  // --- Ingredients ---
  const flour = await prisma.ingredient.create({
    data: { businessId: business.id, name: "Flour", category: "Dry goods", baseUnit: "GRAM", minStockLevel: "3000" },
  });
  const sugar = await prisma.ingredient.create({
    data: { businessId: business.id, name: "Sugar", category: "Dry goods", baseUnit: "GRAM", minStockLevel: "1000" },
  });
  const yogurt = await prisma.ingredient.create({
    data: { businessId: business.id, name: "Yogurt", category: "Dairy", baseUnit: "GRAM", minStockLevel: "300" },
  });
  const granola = await prisma.ingredient.create({
    data: { businessId: business.id, name: "Granola", category: "Dry goods", baseUnit: "GRAM", minStockLevel: "150" },
  });
  const strawberries = await prisma.ingredient.create({
    data: { businessId: business.id, name: "Strawberries", category: "Fruit", baseUnit: "PIECE", minStockLevel: "3" },
  });
  const apple = await prisma.ingredient.create({
    data: { businessId: business.id, name: "Apple", category: "Fruit", baseUnit: "GRAM", minStockLevel: "100" },
  });
  const cashew = await prisma.ingredient.create({
    data: { businessId: business.id, name: "Cashew nuts", category: "Nuts", baseUnit: "GRAM", minStockLevel: "200" },
  });
  const milk = await prisma.ingredient.create({
    data: { businessId: business.id, name: "Milk", category: "Dairy", baseUnit: "ML", minStockLevel: "200" },
  });

  // --- Purchases (standardized automatically) ---
  await purchaseIngredient(flour.id, "GRAM", 50, "KG", 30000, supplier.id); // -> ₦0.60/g
  await purchaseIngredient(sugar.id, "GRAM", 10, "KG", 20000, supplier.id); // 10kg -> 10,000g for ₦20,000 -> ₦2/g
  await purchaseIngredient(yogurt.id, "GRAM", 2000, "G", 6000);
  await purchaseIngredient(granola.id, "GRAM", 1000, "G", 4500);
  await purchaseIngredient(strawberries.id, "PIECE", 10, "PIECE", 10000); // ₦1,000/piece
  await purchaseIngredient(apple.id, "GRAM", 1000, "G", 1500);
  await purchaseIngredient(cashew.id, "GRAM", 10, "KG", 7000, supplier.id); // ₦0.70/g
  await purchaseIngredient(milk.id, "ML", 2, "LITRE", 8000); // ₦4/ml

  // --- Recipes ---
  const parfait = await prisma.recipe.create({
    data: {
      businessId: business.id,
      productName: "Classic Parfait",
      sku: "PARF-001",
      outputQuantity: "10",
      outputUnit: "cup",
      packagingCost: "2000",
      directLaborCost: "1000",
      otherDirectCost: "0",
      sellingPrice: "1500",
      ingredients: {
        create: [
          { ingredientId: yogurt.id, quantity: "1000" },
          { ingredientId: granola.id, quantity: "500" },
          { ingredientId: strawberries.id, quantity: "3" },
          { ingredientId: apple.id, quantity: "200" },
          { ingredientId: cashew.id, quantity: "100" },
        ],
      },
    },
  });

  const bread = await prisma.recipe.create({
    data: {
      businessId: business.id,
      productName: "Sliced Bread",
      sku: "BRD-001",
      outputQuantity: "20",
      outputUnit: "loaf",
      packagingCost: "500",
      directLaborCost: "0",
      otherDirectCost: "0",
      sellingPrice: "400",
      ingredients: {
        create: [
          { ingredientId: flour.id, quantity: "4000" },
          { ingredientId: sugar.id, quantity: "500" },
        ],
      },
    },
  });

  console.log("Seed complete:", { businessId: business.id, parfaitId: parfait.id, breadId: bread.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
