"use client";

import { useState } from "react";
import { Field, Input, Select, Button } from "@/components/ui";
import { compatiblePurchaseUnits, PURCHASE_UNIT_LABEL, BASE_UNIT_LABEL } from "@/lib/units";
import type { BaseUnit } from "@prisma/client";
import { createIngredientAction } from "./actions";

export default function IngredientForm({ onboarding }: { onboarding?: boolean }) {
  const [baseUnit, setBaseUnit] = useState<BaseUnit>("GRAM");
  const units = compatiblePurchaseUnits(baseUnit);

  return (
    <form action={createIngredientAction} className="space-y-4">
      {onboarding && <input type="hidden" name="onboarding" value="1" />}
      <Field label="Name">
        <Input name="name" placeholder="e.g. Flour" required autoFocus />
      </Field>
      <Field label="Category (optional)">
        <Input name="category" placeholder="e.g. Dry goods" />
      </Field>
      <Field
        label="Measured in"
        hint="Whichever you buy in - kg or g, litres or ml - we standardize it to one unit so costs always add up correctly."
      >
        <Select name="baseUnit" value={baseUnit} onChange={(e) => setBaseUnit(e.target.value as BaseUnit)}>
          <option value="GRAM">Weight (kg or g - stored as grams)</option>
          <option value="ML">Volume (litres or ml - stored as ml)</option>
          <option value="PIECE">Count (pieces)</option>
        </Select>
      </Field>
      <Field label="Low stock alert level" hint="Threshold only - it does not set current stock. In the unit above (e.g. grams).">
        <Input name="minStockLevel" type="number" step="any" min="0" defaultValue="0" />
      </Field>

      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="mb-3 text-sm font-medium text-zinc-700">Already have stock? Record it now (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity you bought">
            <Input name="packageQuantity" type="number" step="any" min="0" placeholder="e.g. 50" />
          </Field>
          <Field label="Unit">
            <Select name="packageUnit" defaultValue={units[0]}>
              {units.map((u) => (
                <option key={u} value={u}>
                  {PURCHASE_UNIT_LABEL[u]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Total price paid" hint={`Leave both fields blank to add the ingredient with 0 stock in ${BASE_UNIT_LABEL[baseUnit]}.`}>
            <Input name="totalPrice" type="number" step="any" min="0" placeholder="e.g. 30000" />
          </Field>
        </div>
      </div>

      <Button type="submit" className="w-full">
        Add ingredient
      </Button>
    </form>
  );
}
