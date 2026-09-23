import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { requireCurrentBusiness } from "@/lib/current-business";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cost & Profit Tracker",
  description: "Production costing, inventory and profit tracking for small food businesses",
};

// Every page reads live data straight from Postgres (inventory, costs, sales). Next.js can't see
// through Prisma calls to know that, so without this it would statically prerender pages that take
// no params (e.g. /expenses, /settings) at build time and serve stale data forever in production.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const business = await requireCurrentBusiness();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-200">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-6">
          {business && <Nav businessName={business.name} />}
          <main className="flex-1 rounded-3xl bg-white p-4 shadow-sm sm:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
