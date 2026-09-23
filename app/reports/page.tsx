import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import {
  resolvePeriod,
  getProfitAndLoss,
  getProductProfitabilityReport,
  getInventoryValuation,
  getIngredientUsageReport,
  getProductionReport,
  getSalesReport,
  getExpenseReport,
  getWastageReport,
  type PeriodKey,
} from "@/lib/services/reporting";
import { formatMoney, formatNumber, formatDate, formatDateTime } from "@/lib/format";
import { BASE_UNIT_LABEL } from "@/lib/units";
import { Card, CardTitle, PageHeader, Table, Th, Td, EmptyState, Badge } from "@/components/ui";

const TABS = [
  { key: "pnl", label: "Profit & Loss" },
  { key: "products", label: "Product profitability" },
  { key: "inventory", label: "Inventory" },
  { key: "usage", label: "Ingredient usage" },
  { key: "production", label: "Production" },
  { key: "sales", label: "Sales" },
  { key: "expenses", label: "Expenses" },
  { key: "wastage", label: "Wastage/adjustments" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string; from?: string; to?: string }>;
}) {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");

  const sp = await searchParams;
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "pnl") as TabKey;
  const period = (sp.period as PeriodKey) ?? "30d";
  const isCustom = period === "custom" && sp.from && sp.to;
  const { from, to } = isCustom
    ? resolvePeriod("custom", { from: sp.from!, to: sp.to! })
    : resolvePeriod(["today", "yesterday", "7d", "30d", "mtd"].includes(period) ? period : "30d");

  const currency = business.currency;

  return (
    <div>
      <PageHeader title="Reports" description="Everything the dashboard summarizes, broken down in detail." />

      <div className="mb-4 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/reports?tab=${t.key}&period=${period}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab !== "inventory" && tab !== "products" && (
        <form className="mb-6 flex flex-wrap items-center gap-2" method="get">
          <input type="hidden" name="tab" value={tab} />
          {["today", "yesterday", "7d", "30d", "mtd"].map((p) => (
            <Link
              key={p}
              href={`/reports?tab=${tab}&period=${p}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                period === p && !isCustom ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {p === "7d" ? "7 days" : p === "30d" ? "30 days" : p === "mtd" ? "Month to date" : p[0].toUpperCase() + p.slice(1)}
            </Link>
          ))}
          <input type="hidden" name="period" value="custom" />
          <input type="date" name="from" defaultValue={sp.from} className="rounded-md border border-zinc-300 px-2 py-1 text-sm" />
          <span className="text-sm text-zinc-400">to</span>
          <input type="date" name="to" defaultValue={sp.to} className="rounded-md border border-zinc-300 px-2 py-1 text-sm" />
          <button type="submit" className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200">
            Go
          </button>
        </form>
      )}

      {tab === "pnl" && <ProfitAndLossTab businessId={business.id} from={from} to={to} currency={currency} />}
      {tab === "products" && <ProductProfitabilityTab businessId={business.id} currency={currency} />}
      {tab === "inventory" && <InventoryTab businessId={business.id} currency={currency} />}
      {tab === "usage" && <UsageTab businessId={business.id} from={from} to={to} currency={currency} />}
      {tab === "production" && <ProductionTab businessId={business.id} from={from} to={to} currency={currency} />}
      {tab === "sales" && <SalesTab businessId={business.id} from={from} to={to} currency={currency} />}
      {tab === "expenses" && <ExpensesTab businessId={business.id} from={from} to={to} currency={currency} />}
      {tab === "wastage" && <WastageTab businessId={business.id} from={from} to={to} />}
    </div>
  );
}

async function ProfitAndLossTab({ businessId, from, to, currency }: { businessId: string; from: Date; to: Date; currency: string }) {
  const pnl = await getProfitAndLoss(businessId, from, to);
  const rows: [string, string][] = [
    ["Sales revenue", formatMoney(pnl.revenue, currency)],
    ["Discounts", `- ${formatMoney(pnl.discounts, currency)}`],
    ["Cost of goods sold", `- ${formatMoney(pnl.cogs, currency)}`],
    ["Gross profit", formatMoney(pnl.grossProfit, currency)],
    ["Operating expenses", `- ${formatMoney(pnl.operatingExpenses, currency)}`],
    ["Operating profit", formatMoney(pnl.operatingProfit, currency)],
    ["Gross margin", `${pnl.grossMarginPct.toDecimalPlaces(1)}%`],
    ["Units sold", formatNumber(pnl.unitsSold, 0)],
  ];
  return (
    <Card className="max-w-lg">
      <CardTitle>Profit & Loss summary</CardTitle>
      <dl className="divide-y divide-zinc-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-2 text-sm">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="font-medium text-zinc-900">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

async function ProductProfitabilityTab({ businessId, currency }: { businessId: string; currency: string }) {
  const rows = await getProductProfitabilityReport(businessId);
  return (
    <Card>
      <CardTitle>Product profitability (based on most recent production batch)</CardTitle>
      {rows.length === 0 ? (
        <EmptyState message="No recipes yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Selling price</Th>
              <Th>Unit cost</Th>
              <Th>Gross profit</Th>
              <Th>Margin</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.recipeId}>
                <Td className="font-medium text-zinc-900">{r.name}</Td>
                <Td>{formatMoney(r.sellingPrice, currency)}</Td>
                <Td>{r.hasProduction ? formatMoney(r.unitCost, currency) : <Badge>No production yet</Badge>}</Td>
                <Td className={r.grossProfit.gte(0) ? "text-emerald-600" : "text-red-600"}>{formatMoney(r.grossProfit, currency)}</Td>
                <Td>{r.marginPct.toDecimalPlaces(1).toString()}%</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function InventoryTab({ businessId, currency }: { businessId: string; currency: string }) {
  const { lines, totalValue } = await getInventoryValuation(businessId);
  return (
    <Card>
      <CardTitle>Inventory report - total value {formatMoney(totalValue, currency)}</CardTitle>
      {lines.length === 0 ? (
        <EmptyState message="No ingredients yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Ingredient</Th>
              <Th>Quantity</Th>
              <Th>Avg cost</Th>
              <Th>Value</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.ingredientId}>
                <Td className="font-medium text-zinc-900">{l.name}</Td>
                <Td>
                  {formatNumber(l.currentStock.toString())} {BASE_UNIT_LABEL[l.baseUnit]}
                </Td>
                <Td>{formatMoney(l.avgCostPerUnit, currency)}</Td>
                <Td>{formatMoney(l.value, currency)}</Td>
                <Td>{l.lowStock && <Badge tone="warning">Low stock</Badge>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function UsageTab({ businessId, from, to, currency }: { businessId: string; from: Date; to: Date; currency: string }) {
  const rows = await getIngredientUsageReport(businessId, from, to);
  return (
    <Card>
      <CardTitle>Ingredient usage report</CardTitle>
      {rows.length === 0 ? (
        <EmptyState message="No production in this period." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Ingredient</Th>
              <Th>Quantity used</Th>
              <Th>Cost</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ingredientId}>
                <Td className="font-medium text-zinc-900">{r.name}</Td>
                <Td>
                  {formatNumber(r.quantity.toString())} {BASE_UNIT_LABEL[r.baseUnit as keyof typeof BASE_UNIT_LABEL]}
                </Td>
                <Td>{formatMoney(r.cost, currency)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function ProductionTab({ businessId, from, to, currency }: { businessId: string; from: Date; to: Date; currency: string }) {
  const batches = await getProductionReport(businessId, from, to);
  return (
    <Card>
      <CardTitle>Production report</CardTitle>
      {batches.length === 0 ? (
        <EmptyState message="No production in this period." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Product</Th>
              <Th>Planned</Th>
              <Th>Actual</Th>
              <Th>Batch cost</Th>
              <Th>Cost/unit</Th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <Td>{formatDateTime(b.producedAt)}</Td>
                <Td className="font-medium text-zinc-900">{b.recipe.productName}</Td>
                <Td>{b.plannedOutput.toString()}</Td>
                <Td>{b.actualOutput.toString()}</Td>
                <Td>{formatMoney(b.totalBatchCost.toString(), currency)}</Td>
                <Td>{formatMoney(b.costPerUnit.toString(), currency)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function SalesTab({ businessId, from, to, currency }: { businessId: string; from: Date; to: Date; currency: string }) {
  const sales = await getSalesReport(businessId, from, to);
  return (
    <Card>
      <CardTitle>Sales report</CardTitle>
      {sales.length === 0 ? (
        <EmptyState message="No sales in this period." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Items</Th>
              <Th>Revenue</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <Td>{formatDateTime(s.saleDate)}</Td>
                <Td>{s.items.map((i) => `${i.quantity.toString()} × ${i.recipe.productName}`).join(", ")}</Td>
                <Td>{formatMoney(s.items.reduce((sum, i) => sum + Number(i.lineRevenue), 0), currency)}</Td>
                <Td>
                  <Badge tone={s.status === "COMPLETED" ? "success" : s.status === "VOIDED" ? "danger" : "warning"}>{s.status}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function ExpensesTab({ businessId, from, to, currency }: { businessId: string; from: Date; to: Date; currency: string }) {
  const { expenses, total, byCategory } = await getExpenseReport(businessId, from, to);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardTitle>Expense report - total {formatMoney(total, currency)}</CardTitle>
        {expenses.length === 0 ? (
          <EmptyState message="No expenses in this period." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <Td>{formatDate(e.expenseDate)}</Td>
                  <Td className="font-medium text-zinc-900">{e.category}</Td>
                  <Td>{formatMoney(e.amount.toString(), currency)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card>
        <CardTitle>By category</CardTitle>
        {byCategory.length === 0 ? (
          <EmptyState message="No expenses in this period." />
        ) : (
          <ul className="space-y-2">
            {byCategory.map((c) => (
              <li key={c.category} className="flex justify-between text-sm">
                <span className="text-zinc-600">{c.category}</span>
                <span className="font-medium text-zinc-900">{formatMoney(c.total, currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function WastageTab({ businessId, from, to }: { businessId: string; from: Date; to: Date }) {
  const transactions = await getWastageReport(businessId, from, to);
  return (
    <Card>
      <CardTitle>Wastage / adjustment report</CardTitle>
      {transactions.length === 0 ? (
        <EmptyState message="No wastage or adjustments in this period." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Ingredient</Th>
              <Th>Type</Th>
              <Th>Quantity</Th>
              <Th>Note</Th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <Td>{formatDateTime(t.createdAt)}</Td>
                <Td className="font-medium text-zinc-900">{t.ingredient.name}</Td>
                <Td>
                  <Badge tone={t.type === "WASTAGE" ? "danger" : "default"}>{t.type}</Badge>
                </Td>
                <Td>
                  {formatNumber(t.quantity.toString())} {BASE_UNIT_LABEL[t.ingredient.baseUnit]}
                </Td>
                <Td>{t.note ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
