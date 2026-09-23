"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { Field, Input, Select, Textarea, Button, Table, Th, Td, FormError } from "@/components/ui";
import { BASE_UNIT_LABEL } from "@/lib/units";
import type { BaseUnit } from "@prisma/client";

interface RecipeOption {
  id: string;
  productName: string;
  outputQuantity: string;
  outputUnit: string;
  packagingCost: string;
  directLaborCost: string;
  otherDirectCost: string;
  ingredients: {
    ingredientId: string;
    name: string;
    baseUnit: BaseUnit;
    quantityPerBatch: string;
    avgCostPerUnit: string;
    currentStock: string;
  }[];
}

export default function ProductionForm({
  recipes,
  currency,
  action,
  defaultRecipeId,
}: {
  recipes: RecipeOption[];
  currency: string;
  action: (formData: FormData) => void;
  defaultRecipeId?: string;
}) {
  const [recipeId, setRecipeId] = useState(defaultRecipeId ?? recipes[0]?.id ?? "");
  const recipe = useMemo(() => recipes.find((r) => r.id === recipeId), [recipes, recipeId]);
  const [plannedOutput, setPlannedOutput] = useState(recipe?.outputQuantity ?? "1");
  const [actualOutput, setActualOutput] = useState(recipe?.outputQuantity ?? "1");

  function onRecipeChange(id: string) {
    setRecipeId(id);
    const r = recipes.find((x) => x.id === id);
    if (r) {
      setPlannedOutput(r.outputQuantity);
      setActualOutput(r.outputQuantity);
    }
  }

  const preview = useMemo(() => {
    if (!recipe) return null;
    const scale = new Decimal(plannedOutput || 0).div(recipe.outputQuantity || "1");
    const lines = recipe.ingredients.map((ri) => {
      const quantity = new Decimal(ri.quantityPerBatch).mul(scale);
      const unitCost = new Decimal(ri.avgCostPerUnit);
      const cost = quantity.mul(unitCost);
      const available = new Decimal(ri.currentStock);
      return { ...ri, quantity, cost, insufficient: available.lt(quantity) };
    });
    const ingredientCost = lines.reduce((s, l) => s.add(l.cost), new Decimal(0));
    const packaging = new Decimal(recipe.packagingCost).mul(scale);
    const labor = new Decimal(recipe.directLaborCost).mul(scale);
    const other = new Decimal(recipe.otherDirectCost).mul(scale);
    const total = ingredientCost.add(packaging).add(labor).add(other);
    const output = new Decimal(actualOutput || 0);
    const perUnit = output.gt(0) ? total.div(output) : new Decimal(0);
    const hasShortfall = lines.some((l) => l.insufficient);
    return { lines, total, perUnit, hasShortfall };
  }, [recipe, plannedOutput, actualOutput]);

  if (recipes.length === 0) {
    return <p className="text-sm text-zinc-500">Create a recipe first before recording production.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Recipe">
        <Select value={recipeId} name="recipeId" onChange={(e) => onRecipeChange(e.target.value)} required>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.productName}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Planned output" hint={`Recipe batch = ${recipe?.outputQuantity} ${recipe?.outputUnit}`}>
          <Input
            name="plannedOutput"
            type="number"
            step="any"
            min="0.0001"
            value={plannedOutput}
            onChange={(e) => setPlannedOutput(e.target.value)}
            required
          />
        </Field>
        <Field label="Actual output" hint="If less than planned, cost per unit rises automatically.">
          <Input
            name="actualOutput"
            type="number"
            step="any"
            min="0"
            value={actualOutput}
            onChange={(e) => setActualOutput(e.target.value)}
            required
          />
        </Field>
      </div>
      <Field label="Wastage / shortfall note (optional)">
        <Input name="wastageNote" placeholder="e.g. 2 units broke while packing" />
      </Field>
      <Field label="Notes (optional)">
        <Textarea name="notes" rows={2} />
      </Field>

      {preview && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-zinc-700">This batch will consume</h3>
          <Table>
            <thead>
              <tr>
                <Th>Ingredient</Th>
                <Th>Needed</Th>
                <Th>In stock</Th>
                <Th>Cost</Th>
              </tr>
            </thead>
            <tbody>
              {preview.lines.map((l) => (
                <tr key={l.ingredientId}>
                  <Td className={l.insufficient ? "text-red-600" : undefined}>{l.name}</Td>
                  <Td>
                    {l.quantity.toDecimalPlaces(2).toString()} {BASE_UNIT_LABEL[l.baseUnit]}
                  </Td>
                  <Td className={l.insufficient ? "text-red-600" : undefined}>
                    {new Decimal(l.currentStock).toDecimalPlaces(2).toString()} {BASE_UNIT_LABEL[l.baseUnit]}
                  </Td>
                  <Td>
                    {currency} {l.cost.toDecimalPlaces(2).toString()}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Total batch cost</dt>
              <dd className="font-medium text-zinc-900">
                {currency} {preview.total.toDecimalPlaces(2).toString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Cost per unit (at actual output)</dt>
              <dd className="font-medium text-zinc-900">
                {currency} {preview.perUnit.toDecimalPlaces(2).toString()}
              </dd>
            </div>
          </dl>
          {preview.hasShortfall && (
            <div className="mt-3">
              <FormError message="Not enough stock for one or more ingredients." />
              <label className="mt-2 flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="allowNegativeInventory" />
                Record anyway (allow negative inventory)
              </label>
            </div>
          )}
        </div>
      )}

      <Button type="submit">Record production</Button>
    </form>
  );
}
