"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChefHat, RefreshCcw } from "lucide-react";

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
  const router = useRouter();
  const initial = businessName.trim().charAt(0).toUpperCase() || "B";

  return (
    <div className="flex items-center gap-3 py-4">
      <Link
        href="/dashboard"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white"
        title={businessName}
      >
        <ChefHat className="h-5 w-5" />
      </Link>

      <nav className="relative min-w-0 flex-1 overflow-hidden rounded-full">
        <div className="scrollbar-none flex items-center gap-1 overflow-x-auto rounded-full bg-zinc-900 p-1">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-white text-zinc-900" : "text-zinc-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-zinc-900 to-transparent" />
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => router.refresh()}
          title="Refresh data"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
        <Link
          href="/settings"
          title="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-300"
        >
          {initial}
        </Link>
        <Link
          href="/production"
          className="hidden rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 sm:inline-block"
        >
          + Record production
        </Link>
      </div>
    </div>
  );
}
