"use client";

import { useMemo, useState } from "react";
import { Field, Input, Select, Button } from "@/components/ui";
import { compatiblePurchaseUnits, PURCHASE_UNIT_LABEL } from "@/lib/units";
import type { BaseUnit } from "@prisma/client";
import { recordPurchaseAction } from "./actions";

interface IngredientOption {
  id: string;
  name: string;
  baseUnit: BaseUnit;
}

export default function PurchaseForm({
  ingredients,
  suppliers,
}: {
  ingredients: IngredientOption[];
  suppliers: { id: string; name: string }[];
}) {
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id ?? "");
  const selected = useMemo(() => ingredients.find((i) => i.id === ingredientId), [ingredients, ingredientId]);
  const units = selected ? compatiblePurchaseUnits(selected.baseUnit) : [];

  if (ingredients.length === 0) {
    return <p className="text-sm text-zinc-500">Add an ingredient first before recording a purchase.</p>;
  }

  return (
    <form action={recordPurchaseAction} className="space-y-4">
      <Field label="Ingredient">
        <Select name="ingredientId" value={ingredientId} onChange={(e) => setIngredientId(e.target.value)} required>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Package quantity">
          <Input name="packageQuantity" type="number" step="any" min="0" placeholder="e.g. 50" required />
        </Field>
        <Field label="Package unit">
          <Select name="packageUnit" required>
            {units.map((u) => (
              <option key={u} value={u}>
                {PURCHASE_UNIT_LABEL[u]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Total price paid">
        <Input name="totalPrice" type="number" step="any" min="0" placeholder="e.g. 30000" required />
      </Field>
      {suppliers.length > 0 && (
        <Field label="Supplier (optional)">
          <Select name="supplierId" defaultValue="">
            <option value="">— none —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Purchase date">
        <Input name="purchaseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </Field>
      <Button type="submit" className="w-full">
        Record purchase
      </Button>
    </form>
  );
}
