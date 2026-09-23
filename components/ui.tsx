import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{children}</h2>;
}

export function StatTile({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "positive" | "negative" }) {
  const toneClass = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-zinc-900";
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </Card>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({ children, className = "", variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-700",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  const styles = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-700",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
  };
  return (
    <a href={href} className={`inline-block rounded-md px-3 py-2 text-sm font-medium transition-colors ${styles[variant]}`}>
      {children}
    </a>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  "block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClass} {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={inputClass} {...props} />;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`border-b border-zinc-200 pb-2 pr-4 font-medium text-zinc-500 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-zinc-100 py-2 pr-4 text-zinc-800 ${className}`}>{children}</td>;
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warning" | "danger" | "success" }) {
  const styles = {
    default: "bg-zinc-100 text-zinc-700",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    success: "bg-emerald-100 text-emerald-700",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[tone]}`}>{children}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-zinc-500">{message}</p>;
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}
