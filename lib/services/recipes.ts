import Decimal from "decimal.js";
import { prisma } from "../prisma";
import { calculateBatchCost, calculateUsageCost } from "./costing";
import { NotFoundError } from "./errors";

export interface RecipeIngredientInput {
  ingredientId: string;
  quantity: string;
}

export interface RecipeInput {
  businessId: string;
  productName: string;
  sku?: string;
  outputQuantity: string;
  outputUnit?: string;
  packagingCost?: string;
  directLaborCost?: string;
  otherDirectCost?: string;
  sellingPrice?: string;
  ingredients: RecipeIngredientInput[];
}

export async function createRecipe(input: RecipeInput) {
  return prisma.recipe.create({
    data: {
      businessId: input.businessId,
      productName: input.productName,
      sku: input.sku,
      outputQuantity: input.outputQuantity,
      outputUnit: input.outputUnit ?? "unit",
      packagingCost: input.packagingCost ?? "0",
      directLaborCost: input.directLaborCost ?? "0",
      otherDirectCost: input.otherDirectCost ?? "0",
      sellingPrice: input.sellingPrice ?? "0",
      ingredients: {
        create: input.ingredients.map((i) => ({ ingredientId: i.ingredientId, quantity: i.quantity })),
      },
    },
    include: { ingredients: { include: { ingredient: true } } },
  });
}

export async function updateRecipe(
  id: string,
  input: Partial<Omit<RecipeInput, "businessId">> & { active?: boolean },
) {
  const { ingredients, ...rest } = input;
  return prisma.$transaction(async (tx) => {
    if (ingredients) {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      await tx.recipeIngredient.createMany({
        data: ingredients.map((i) => ({ recipeId: id, ingredientId: i.ingredientId, quantity: i.quantity })),
      });
    }
    return tx.recipe.update({
      where: { id },
      data: rest,
      include: { ingredients: { include: { ingredient: true } } },
    });
  });
}

export async function listRecipes(businessId: string, { includeInactive = false }: { includeInactive?: boolean } = {}) {
  return prisma.recipe.findMany({
    where: { businessId, ...(includeInactive ? {} : { active: true }) },
    include: { ingredients: { include: { ingredient: true } } },
    orderBy: { productName: "asc" },
  });
}

export async function getRecipe(id: string) {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: { include: { ingredient: true } } },
  });
  if (!recipe) throw new NotFoundError("Recipe", id);
  return recipe;
}

/**
 * Live cost preview for a recipe using each ingredient's *current* weighted-average cost.
 * This is what the UI shows while editing a recipe; it is recomputed fresh every time and is
 * not what gets stored on a production batch (that snapshot is frozen at production time).
 */
export async function previewRecipeCost(recipeId: string, plannedOutput?: string) {
  const recipe = await getRecipe(recipeId);
  const scale = plannedOutput ? new Decimal(plannedOutput).div(recipe.outputQuantity.toString()) : new Decimal(1);

  const ingredientLines = recipe.ingredients.map((ri) => {
    const quantity = new Decimal(ri.quantity.toString()).mul(scale);
    const cost = calculateUsageCost(quantity, ri.ingredient.avgCostPerUnit.toString());
    return {
      ingredientId: ri.ingredientId,
      name: ri.ingredient.name,
      baseUnit: ri.ingredient.baseUnit,
      quantity,
      unitCost: new Decimal(ri.ingredient.avgCostPerUnit.toString()),
      cost,
    };
  });

  const ingredientCost = ingredientLines.reduce((sum, l) => sum.add(l.cost), new Decimal(0));
  const packagingCost = new Decimal(recipe.packagingCost.toString()).mul(scale);
  const laborCost = new Decimal(recipe.directLaborCost.toString()).mul(scale);
  const otherCost = new Decimal(recipe.otherDirectCost.toString()).mul(scale);
  const outputQuantity = plannedOutput ? new Decimal(plannedOutput) : new Decimal(recipe.outputQuantity.toString());

  const breakdown = calculateBatchCost(ingredientCost, packagingCost, laborCost, otherCost, outputQuantity);

  return { recipe, scale, ingredientLines, ...breakdown };
}
