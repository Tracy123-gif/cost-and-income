"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";

interface BatchOption {
  id: string;
  costPerUnit: string;
  unitsRemaining: string;
  producedAt: string;
}

interface RecipeOption {
  id: string;
  productName: string;
  sellingPrice: string;
  batches: BatchOption[];
}

interface SaleLine {
  recipeId: string;
  productionBatchId: string;
  quantity: string;
  unitPrice: string;
}

export default function SalesForm({
  recipes,
  currency,
  action,
}: {
  recipes: RecipeOption[];
  currency: string;
  action: (formData: FormData) => void;
}) {
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const firstRecipe = recipes.find((r) => r.batches.length > 0);
  const [lines, setLines] = useState<SaleLine[]>(
    firstRecipe
      ? [
          {
            recipeId: firstRecipe.id,
            productionBatchId: firstRecipe.batches[0].id,
            quantity: "1",
            unitPrice: firstRecipe.sellingPrice,
          },
        ]
      : [],
  );

  function addLine() {
    if (!firstRecipe) return;
    setLines((ls) => [
      ...ls,
      { recipeId: firstRecipe.id, productionBatchId: firstRecipe.batches[0].id, quantity: "1", unitPrice: firstRecipe.sellingPrice },
    ]);
  }

  function removeLine(index: number) {
    setLines((ls) => ls.filter((_, i) => i !== index));
  }

  function updateLine(index: number, patch: Partial<SaleLine>) {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function onRecipeChange(index: number, recipeId: string) {
    const r = recipeMap.get(recipeId);
    updateLine(index, {
      recipeId,
      productionBatchId: r?.batches[0]?.id ?? "",
      unitPrice: r?.sellingPrice ?? "0",
    });
  }

  const total = useMemo(
    () => lines.reduce((sum, l) => sum.add(new Decimal(l.quantity || 0).mul(l.unitPrice || 0)), new Decimal(0)),
    [lines],
  );

  const availableRecipes = recipes.filter((r) => r.batches.length > 0);

  if (availableRecipes.length === 0) {
    return <p className="text-sm text-zinc-500">No finished-goods stock yet. Record a production batch first.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="itemsJson" value={JSON.stringify(lines)} />

      <div className="space-y-3">
        {lines.map((line, index) => {
          const recipe = recipeMap.get(line.recipeId);
          return (
            <div key={index} className="space-y-2 rounded-md border border-zinc-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Item {index + 1}</span>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(index)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <Select value={line.recipeId} onChange={(e) => onRecipeChange(index, e.target.value)}>
                {availableRecipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.productName}
                  </option>
                ))}
              </Select>
              <Select value={line.productionBatchId} onChange={(e) => updateLine(index, { productionBatchId: e.target.value })}>
                {recipe?.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Batch {new Date(b.producedAt).toLocaleDateString()} · {b.unitsRemaining} left · cost {currency}
                    {Number(b.costPerUnit).toFixed(2)}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Quantity"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                />
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Unit price"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="secondary" onClick={addLine} className="w-full">
        + Add another item
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Payment method">
          <Select name="paymentMethod" defaultValue="CASH">
            <option value="CASH">Cash</option>
            <option value="TRANSFER">Transfer</option>
            <option value="CARD">Card</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Discount (optional)">
          <Input name="discountAmount" type="number" step="any" min="0" defaultValue="0" />
        </Field>
      </div>
      <Field label="Customer reference (optional)">
        <Input name="customerRef" />
      </Field>
      <Field label="Sale date">
        <Input name="saleDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </Field>
      <Field label="Note (optional)">
        <Textarea name="note" rows={2} />
      </Field>

      <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-sm font-medium">
        <span className="text-zinc-500">Total</span>
        <span className="text-zinc-900">
          {currency} {total.toDecimalPlaces(2).toString()}
        </span>
      </div>

      <Button type="submit" className="w-full">
        Record sale
      </Button>
    </form>
  );
}
