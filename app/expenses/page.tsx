import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import { listExpenses, EXPENSE_CATEGORIES } from "@/lib/services/expenses";
import { formatMoney, formatDate } from "@/lib/format";
import { Card, CardTitle, PageHeader, Field, Input, Select, Textarea, Button, Table, Th, Td, EmptyState } from "@/components/ui";
import { recordExpenseAction } from "./actions";

export default async function ExpensesPage() {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");

  const expenses = await listExpenses(business.id);
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Operating costs like rent, transport and salaries - kept separate from direct production cost."
      />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardTitle>All expenses ({formatMoney(total, business.currency)} total)</CardTitle>
            {expenses.length === 0 ? (
              <EmptyState message="No expenses recorded yet." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Category</Th>
                    <Th>Amount</Th>
                    <Th>Note</Th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <Td>{formatDate(e.expenseDate)}</Td>
                      <Td className="font-medium text-zinc-900">{e.category}</Td>
                      <Td>{formatMoney(e.amount.toString(), business.currency)}</Td>
                      <Td>{e.note ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <Card>
          <CardTitle>Record an expense</CardTitle>
          <form action={recordExpenseAction} className="space-y-4">
            <Field label="Category">
              <Select name="category" defaultValue={EXPENSE_CATEGORIES[0]}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount">
              <Input name="amount" type="number" step="any" min="0" required />
            </Field>
            <Field label="Date">
              <Input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Note (optional)">
              <Textarea name="note" rows={2} />
            </Field>
            <Button type="submit" className="w-full">
              Record expense
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
