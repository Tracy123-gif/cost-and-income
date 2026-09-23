"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/purchases", label: "Purchases" },
  { href: "/recipes", label: "Recipes" },
  { href: "/production", label: "Production" },
  { href: "/sales", label: "Sales" },
  { href: "/expenses", label: "Expenses" },
  { href: "/reports", label: "Reports" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/settings", label: "Settings" },
];

export default function Nav({ businessName }: { businessName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-zinc-900">
            {businessName}
          </Link>
          <Link
            href="/production/new"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Record production
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-2 text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors ${
                  active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
