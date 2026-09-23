import Decimal from "decimal.js";

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
  KES: "KSh",
  GHS: "GH₵",
  ZAR: "R",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

export function formatMoney(value: Decimal.Value, currency: string): string {
  const amount = new Decimal(value).toDecimalPlaces(2).toNumber();
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currencySymbol(currency)}${formatted}`;
}

export function formatNumber(value: Decimal.Value, decimals = 2): string {
  return new Decimal(value).toDecimalPlaces(decimals).toNumber().toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function toDateInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}
