"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { Field, Input, Select, Button, Table, Th, Td } from "@/components/ui";
import { BASE_UNIT_LABEL } from "@/lib/units";
import type { BaseUnit } from "@prisma/client";

interface IngredientOption {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  avgCostPerUnit: string;
}

interface RecipeLine {
  ingredientId: string;
  quantity: string;
}

export interface RecipeFormValues {
  productName: string;
  sku: string;
  outputQuantity: string;
  outputUnit: string;
  packagingCost: string;
  directLaborCost: string;
  otherDirectCost: string;
  sellingPrice: string;
  ingredients: RecipeLine[];
}

const DEFAULT_VALUES: RecipeFormValues = {
  productName: "",
  sku: "",
  outputQuantity: "1",
  outputUnit: "unit",
  packagingCost: "0",
  directLaborCost: "0",
  otherDirectCost: "0",
  sellingPrice: "0",
  ingredients: [],
};

export default function RecipeForm({
  ingredients,
  initial,
  action,
  submitLabel,
  currency,
}: {
  ingredients: IngredientOption[];
  initial?: Partial<RecipeFormValues>;
  action: (formData: FormData) => void;
  submitLabel: string;
  currency: string;
}) {
  const [values, setValues] = useState<RecipeFormValues>({ ...DEFAULT_VALUES, ...initial });

  const ingredientMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  function updateLine(index: number, patch: Partial<RecipeLine>) {
    setValues((v) => ({
      ...v,
      ingredients: v.ingredients.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  }

  function addLine() {
    const firstAvailable = ingredients.find((i) => !values.ingredients.some((l) => l.ingredientId === i.id));
    if (!firstAvailable) return;
    setValues((v) => ({ ...v, ingredients: [...v.ingredients, { ingredientId: firstAvailable.id, quantity: "" }] }));
  }

  function removeLine(index: number) {
    setValues((v) => ({ ...v, ingredients: v.ingredients.filter((_, i) => i !== index) }));
  }

  const preview = useMemo(() => {
    const lines = values.ingredients.map((l) => {
      const ing = ingredientMap.get(l.ingredientId);
      const qty = new Decimal(l.quantity || 0);
      const unitCost = new Decimal(ing?.avgCostPerUnit ?? 0);
      const cost = qty.mul(unitCost);
      return { ing, qty, unitCost, cost };
    });
    const ingredientCost = lines.reduce((sum, l) => sum.add(l.cost), new Decimal(0));
    const output = new Decimal(values.outputQuantity || 0);
    const total = ingredientCost
      .add(new Decimal(values.packagingCost || 0))
      .add(new Decimal(values.directLaborCost || 0))
      .add(new Decimal(values.otherDirectCost || 0));
    const perUnit = output.gt(0) ? total.div(output) : new Decimal(0);
    const sellingPrice = new Decimal(values.sellingPrice || 0);
    const marginPerUnit = sellingPrice.sub(perUnit);
    return { lines, ingredientCost, total, perUnit, marginPerUnit };
  }, [values, ingredientMap]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="ingredientsJson" value={JSON.stringify(values.ingredients)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name">
          <Input
            name="productName"
            required
            value={values.productName}
            onChange={(e) => setValues((v) => ({ ...v, productName: e.target.value }))}
          />
        </Field>
        <Field label="SKU / code (optional)">
          <Input name="sku" value={values.sku} onChange={(e) => setValues((v) => ({ ...v, sku: e.target.value }))} />
        </Field>
        <Field label="Batch output quantity">
          <Input
            name="outputQuantity"
            type="number"
            step="any"
            min="0.0001"
            required
            value={values.outputQuantity}
            onChange={(e) => setValues((v) => ({ ...v, outputQuantity: e.target.value }))}
          />
        </Field>
        <Field label="Output unit label" hint="e.g. cup, loaf, box">
          <Input
            name="outputUnit"
            value={values.outputUnit}
            onChange={(e) => setValues((v) => ({ ...v, outputUnit: e.target.value }))}
          />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700">Ingredients for one batch</span>
          <Button type="button" variant="secondary" onClick={addLine} disabled={values.ingredients.length >= ingredients.length}>
            + Add ingredient
          </Button>
        </div>
        {values.ingredients.length === 0 ? (
          <p className="text-sm text-zinc-500">No ingredients added yet.</p>
        ) : (
          <div className="space-y-2">
            {values.ingredients.map((line, index) => {
              const ing = ingredientMap.get(line.ingredientId);
              return (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      value={line.ingredientId}
                      onChange={(e) => updateLine(index, { ingredientId: e.target.value })}
                    >
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder={`Qty (${ing ? BASE_UNIT_LABEL[ing.baseUnit] : ""})`}
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: e.target.value })}
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={() => removeLine(index)}>
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Packaging cost">
          <Input
            name="packagingCost"
            type="number"
            step="any"
            min="0"
            value={values.packagingCost}
            onChange={(e) => setValues((v) => ({ ...v, packagingCost: e.target.value }))}
          />
        </Field>
        <Field label="Direct labor cost">
          <Input
            name="directLaborCost"
            type="number"
            step="any"
            min="0"
            value={values.directLaborCost}
            onChange={(e) => setValues((v) => ({ ...v, directLaborCost: e.target.value }))}
          />
        </Field>
        <Field label="Other direct cost">
          <Input
            name="otherDirectCost"
            type="number"
            step="any"
            min="0"
            value={values.otherDirectCost}
            onChange={(e) => setValues((v) => ({ ...v, otherDirectCost: e.target.value }))}
          />
        </Field>
      </div>

      <Field label="Selling price per unit">
        <Input
          name="sellingPrice"
          type="number"
          step="any"
          min="0"
          value={values.sellingPrice}
          onChange={(e) => setValues((v) => ({ ...v, sellingPrice: e.target.value }))}
        />
      </Field>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-zinc-700">Live cost preview</h3>
        {preview.lines.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Ingredient</Th>
                <Th>Qty</Th>
                <Th>Cost</Th>
              </tr>
            </thead>
            <tbody>
              {preview.lines.map((l, i) => (
                <tr key={i}>
                  <Td>{l.ing?.name ?? "—"}</Td>
                  <Td>
                    {l.qty.toString()} {l.ing ? BASE_UNIT_LABEL[l.ing.baseUnit] : ""}
                  </Td>
                  <Td>
                    {currency} {l.cost.toDecimalPlaces(2).toString()}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Total batch cost</dt>
            <dd className="font-medium text-zinc-900">
              {currency} {preview.total.toDecimalPlaces(2).toString()}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Cost per {values.outputUnit || "unit"}</dt>
            <dd className="font-medium text-zinc-900">
              {currency} {preview.perUnit.toDecimalPlaces(2).toString()}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Gross profit per {values.outputUnit || "unit"}</dt>
            <dd className={`font-medium ${preview.marginPerUnit.gte(0) ? "text-emerald-600" : "text-red-600"}`}>
              {currency} {preview.marginPerUnit.toDecimalPlaces(2).toString()}
            </dd>
          </div>
        </dl>
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
