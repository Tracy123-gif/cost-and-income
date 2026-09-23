import { notFound } from "next/navigation";
import Link from "next/link";
import { getIngredient } from "@/lib/services/ingredients";
import { listInventoryTransactions } from "@/lib/services/inventory";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatNumber, formatDateTime } from "@/lib/format";
import { BASE_UNIT_LABEL } from "@/lib/units";
import { Card, CardTitle, PageHeader, Field, Input, Select, Textarea, Button, Table, Th, Td, Badge, EmptyState } from "@/components/ui";
import { updateIngredientAction, recordAdjustmentAction } from "../actions";

export default async function IngredientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ingredient;
  try {
    ingredient = await getIngredient(id);
  } catch {
    notFound();
  }

  const business = await prisma.business.findUniqueOrThrow({ where: { id: ingredient.businessId } });
  const transactions = await listInventoryTransactions(id, 30);
  const lowStock = Number(ingredient.currentStock) <= Number(ingredient.minStockLevel);
  const unitLabel = BASE_UNIT_LABEL[ingredient.baseUnit];

  const updateAction = updateIngredientAction.bind(null, id);
  const adjustAction = recordAdjustmentAction.bind(null, id);

  return (
    <div>
      <PageHeader
        title={ingredient.name}
        description={`${ingredient.category ?? "Uncategorized"} · measured in ${unitLabel}`}
        action={
          <Link href="/purchases" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            Record a purchase →
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Current stock</div>
              <div className="mt-1 text-xl font-semibold text-zinc-900">
                {formatNumber(ingredient.currentStock.toString())} {unitLabel}
              </div>
              {lowStock && (
                <div className="mt-1">
                  <Badge tone="warning">Below minimum</Badge>
                </div>
              )}
            </Card>
            <Card>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Avg cost / {unitLabel}</div>
              <div className="mt-1 text-xl font-semibold text-zinc-900">
                {formatMoney(ingredient.avgCostPerUnit.toString(), business.currency)}
              </div>
            </Card>
            <Card>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Stock value</div>
              <div className="mt-1 text-xl font-semibold text-zinc-900">
                {formatMoney(Number(ingredient.currentStock) * Number(ingredient.avgCostPerUnit), business.currency)}
              </div>
            </Card>
          </div>

          <Card>
            <CardTitle>Inventory ledger</CardTitle>
            {transactions.length === 0 ? (
              <EmptyState message="No inventory movements yet." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Type</Th>
                    <Th>Quantity</Th>
                    <Th>Balance after</Th>
                    <Th>Note</Th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <Td>{formatDateTime(t.createdAt)}</Td>
                      <Td>
                        <Badge tone={t.type === "PURCHASE" ? "success" : t.type === "WASTAGE" ? "danger" : "default"}>
                          {t.type.replace("_", " ")}
                        </Badge>
                      </Td>
                      <Td className={Number(t.quantity) < 0 ? "text-red-600" : "text-emerald-600"}>
                        {Number(t.quantity) > 0 ? "+" : ""}
                        {formatNumber(t.quantity.toString())} {unitLabel}
                      </Td>
                      <Td>
                        {formatNumber(t.balanceAfter.toString())} {unitLabel}
                      </Td>
                      <Td>{t.note ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>Stock correction / wastage</CardTitle>
            <form action={adjustAction} className="space-y-4">
              <Field label="Type">
                <Select name="type" defaultValue="WASTAGE">
                  <option value="WASTAGE">Wastage / spoilage (reduces stock)</option>
                  <option value="ADJUSTMENT">Physical count correction (signed)</option>
                </Select>
              </Field>
              <Field label={`Quantity (${unitLabel})`} hint="For wastage, enter the amount lost. For a correction, use a negative number to remove stock or positive to add.">
                <Input name="quantityDelta" type="number" step="any" required />
              </Field>
              <Field label="Note (optional)">
                <Textarea name="note" rows={2} />
              </Field>
              <Button type="submit" variant="secondary" className="w-full">
                Record
              </Button>
            </form>
          </Card>

          <Card>
            <CardTitle>Edit ingredient</CardTitle>
            <form action={updateAction} className="space-y-4">
              <Field label="Name">
                <Input name="name" defaultValue={ingredient.name} required />
              </Field>
              <Field label="Category">
                <Input name="category" defaultValue={ingredient.category ?? ""} />
              </Field>
              <Field label={`Low stock alert (${unitLabel})`}>
                <Input name="minStockLevel" type="number" step="any" min="0" defaultValue={ingredient.minStockLevel.toString()} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="active" defaultChecked={ingredient.active} />
                Active
              </label>
              <Button type="submit" variant="secondary" className="w-full">
                Save changes
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
