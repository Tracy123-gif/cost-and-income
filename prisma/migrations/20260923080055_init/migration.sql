-- CreateEnum
CREATE TYPE "BaseUnit" AS ENUM ('GRAM', 'ML', 'PIECE');

-- CreateEnum
CREATE TYPE "PurchaseUnit" AS ENUM ('KG', 'G', 'LITRE', 'ML', 'PIECE');

-- CreateEnum
CREATE TYPE "InventoryTxnType" AS ENUM ('PURCHASE', 'PRODUCTION_CONSUMPTION', 'ADJUSTMENT', 'WASTAGE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'REFUNDED', 'VOIDED');

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "baseUnit" "BaseUnit" NOT NULL,
    "currentStock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "minStockLevel" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "avgCostPerUnit" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "supplierId" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packageQuantity" DECIMAL(18,4) NOT NULL,
    "packageUnit" "PurchaseUnit" NOT NULL,
    "quantityInBaseUnit" DECIMAL(18,4) NOT NULL,
    "totalPrice" DECIMAL(18,2) NOT NULL,
    "unitCost" DECIMAL(18,6) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "type" "InventoryTxnType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "balanceAfter" DECIMAL(18,4) NOT NULL,
    "unitCostAtTime" DECIMAL(18,6) NOT NULL,
    "purchaseId" TEXT,
    "productionConsumptionId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "outputQuantity" DECIMAL(18,4) NOT NULL,
    "outputUnit" TEXT NOT NULL DEFAULT 'unit',
    "packagingCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "directLaborCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherDirectCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "producedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plannedOutput" DECIMAL(18,4) NOT NULL,
    "actualOutput" DECIMAL(18,4) NOT NULL,
    "ingredientCost" DECIMAL(18,2) NOT NULL,
    "packagingCost" DECIMAL(18,2) NOT NULL,
    "laborCost" DECIMAL(18,2) NOT NULL,
    "otherCost" DECIMAL(18,2) NOT NULL,
    "totalBatchCost" DECIMAL(18,2) NOT NULL,
    "costPerUnit" DECIMAL(18,4) NOT NULL,
    "wastageNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionConsumption" (
    "id" TEXT NOT NULL,
    "productionBatchId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantityConsumed" DECIMAL(18,4) NOT NULL,
    "unitCostAtTime" DECIMAL(18,6) NOT NULL,
    "costAtTime" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "ProductionConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "customerRef" TEXT,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "productionBatchId" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,
    "lineRevenue" DECIMAL(18,2) NOT NULL,
    "lineCogs" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ingredient_businessId_idx" ON "Ingredient"("businessId");

-- CreateIndex
CREATE INDEX "Purchase_ingredientId_idx" ON "Purchase"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_purchaseId_key" ON "InventoryTransaction"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_productionConsumptionId_key" ON "InventoryTransaction"("productionConsumptionId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_ingredientId_idx" ON "InventoryTransaction"("ingredientId");

-- CreateIndex
CREATE INDEX "Recipe_businessId_idx" ON "Recipe"("businessId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "ProductionBatch_recipeId_idx" ON "ProductionBatch"("recipeId");

-- CreateIndex
CREATE INDEX "ProductionConsumption_productionBatchId_idx" ON "ProductionConsumption"("productionBatchId");

-- CreateIndex
CREATE INDEX "Sale_businessId_idx" ON "Sale"("businessId");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "Expense_businessId_idx" ON "Expense"("businessId");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_idx" ON "AuditLog"("businessId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_productionConsumptionId_fkey" FOREIGN KEY ("productionConsumptionId") REFERENCES "ProductionConsumption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
