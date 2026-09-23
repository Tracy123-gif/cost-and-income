import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import {
  resolvePeriod,
  getProfitAndLoss,
  getInventoryValuation,
  getTopProducts,
  getIngredientCostChanges,
  getProfitTrend,
  type PeriodKey,
} from "@/lib/services/reporting";
import { formatMoney, formatNumber, formatDate } from "@/lib/format";
import { Card, CardTitle, PageHeader, StatTile, Table, Th, Td, EmptyState, Badge } from "@/components/ui";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "mtd", label: "Month to date" },
];

function ProfitTrendChart({ points, currency }: { points: { date: string; grossProfit: string }[]; currency: string }) {
  if (points.length === 0) return <EmptyState message="No sales yet in this period." />;
  const values = points.map((p) => Number(p.grossProfit));
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 600;
  const height = 120;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = values.map((v, i) => {
    const x = points.length > 1 ? i * step : width / 2;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  const zeroY = height - ((0 - min) / range) * height;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" height={120}>
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="#e4e4e7" strokeWidth={1} />
        <polyline points={coords.join(" ")} fill="none" stroke="#18181b" strokeWidth={2} />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-zinc-400">
        <span>{formatDate(points[0].date)}</span>
        <span>{formatDate(points[points.length - 1].date)}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Daily gross profit, {currency} {min.toFixed(0)} to {currency} {max.toFixed(0)}
      </p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; onboarding?: string }>;
}) {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");

  const sp = await searchParams;
  const period = (sp.period as PeriodKey) ?? "today";
  const isCustom = period === "custom" && sp.from && sp.to;
  const { from, to } = isCustom
    ? resolvePeriod("custom", { from: sp.from!, to: sp.to! })
    : resolvePeriod(["today", "yesterday", "7d", "30d", "mtd"].includes(period) ? period : "today");

  const [pnl, inventory, topProducts, costChanges, trend] = await Promise.all([
    getProfitAndLoss(business.id, from, to),
    getInventoryValuation(business.id),
    getTopProducts(business.id, from, to, 5),
    getIngredientCostChanges(business.id, 5),
    getProfitTrend(business.id, from, to),
  ]);

  const lowStock = inventory.lines.filter((l) => l.lowStock);

  return (
    <div>
      <PageHeader title="Dashboard" description="Where your business stands, in plain language." />

      {sp.onboarding === "complete" && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-800">
            🎉 You&apos;re set up! You bought an ingredient, made a recipe, produced a batch and recorded a sale. Everything below updates automatically as you keep going.
          </p>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/dashboard?period=${p.key}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              period === p.key && !isCustom ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {p.label}
          </Link>
        ))}
        <form className="flex items-center gap-2" method="get">
          <input type="hidden" name="period" value="custom" />
          <input type="date" name="from" defaultValue={sp.from} className="rounded-md border border-zinc-300 px-2 py-1 text-sm" />
          <span className="text-sm text-zinc-400">to</span>
          <input type="date" name="to" defaultValue={sp.to} className="rounded-md border border-zinc-300 px-2 py-1 text-sm" />
          <button type="submit" className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200">
            Go
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Revenue" value={formatMoney(pnl.revenue, business.currency)} />
        <StatTile label="COGS" value={formatMoney(pnl.cogs, business.currency)} />
        <StatTile label="Gross profit" value={formatMoney(pnl.grossProfit, business.currency)} tone={pnl.grossProfit.gte(0) ? "positive" : "negative"} />
        <StatTile label="Expenses" value={formatMoney(pnl.operatingExpenses, business.currency)} />
        <StatTile
          label="Operating profit"
          value={formatMoney(pnl.operatingProfit, business.currency)}
          tone={pnl.operatingProfit.gte(0) ? "positive" : "negative"}
        />
        <StatTile label="Units sold" value={formatNumber(pnl.unitsSold, 0)} sub={`${pnl.grossMarginPct.toDecimalPlaces(1)}% margin`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Profit trend</CardTitle>
          <ProfitTrendChart points={trend.map((t) => ({ date: t.date, grossProfit: t.grossProfit.toString() }))} currency={business.currency} />
        </Card>

        <Card>
          <CardTitle>Inventory value</CardTitle>
          <div className="text-2xl font-semibold text-zinc-900">{formatMoney(inventory.totalValue, business.currency)}</div>
          <p className="mt-1 text-xs text-zinc-500">Across {inventory.lines.length} active ingredients</p>
          {lowStock.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Low stock</div>
              <ul className="space-y-1">
                {lowStock.map((l) => (
                  <li key={l.ingredientId} className="flex items-center justify-between text-sm">
                    <Link href={`/ingredients/${l.ingredientId}`} className="text-zinc-800 hover:underline">
                      {l.name}
                    </Link>
                    <Badge tone="warning">{formatNumber(l.currentStock.toString())} left</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Top products (this period)</CardTitle>
          {topProducts.length === 0 ? (
            <EmptyState message="No sales in this period yet." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Revenue</Th>
                  <Th>Gross profit</Th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.recipeId}>
                    <Td className="font-medium text-zinc-900">{p.name}</Td>
                    <Td>{formatMoney(p.revenue, business.currency)}</Td>
                    <Td className={p.grossProfit.gte(0) ? "text-emerald-600" : "text-red-600"}>{formatMoney(p.grossProfit, business.currency)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardTitle>Ingredient cost changes</CardTitle>
          {costChanges.length === 0 ? (
            <EmptyState message="Buy an ingredient at least twice to see price trends." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Ingredient</Th>
                  <Th>Latest</Th>
                  <Th>Change</Th>
                </tr>
              </thead>
              <tbody>
                {costChanges.map((c) => (
                  <tr key={c.ingredientId}>
                    <Td className="font-medium text-zinc-900">{c.name}</Td>
                    <Td>{formatMoney(c.latestCost, business.currency)}</Td>
                    <Td className={c.changePct.gt(0) ? "text-red-600" : c.changePct.lt(0) ? "text-emerald-600" : undefined}>
                      {c.changePct.gt(0) ? "+" : ""}
                      {c.changePct.toDecimalPlaces(1).toString()}%
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
