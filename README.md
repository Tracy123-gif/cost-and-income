# Business Production Costing & Profit Tracker

Tracks ingredient purchases, standardizes them into base units (g/ml/pcs), costs
recipes and production batches automatically, and reports profit - built from
`Business_Production_Costing_Software_Specification.pdf`.

## Stack

Next.js (App Router) + TypeScript + PostgreSQL + Prisma, styled with Tailwind.
All money/quantity columns are `DECIMAL` in Postgres and computed with
`decimal.js` in the app - no floating-point currency math.

## Setup

1. Have a PostgreSQL server running and create a database.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install dependencies and set up the schema:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed   # optional: demo parfait + bakery data
   ```
4. Run the app: `npm run dev` (http://localhost:3000).

If there's no business yet, the app redirects to `/onboarding` to create one -
after that it walks you through adding an ingredient, a recipe, a production
batch and a sale.

## Tests

`npm test` runs the automated tests for the core cost formulas (unit
conversion, weighted-average costing, batch/unit cost, profit) in
`lib/__tests__`, including the exact worked example from the spec (50kg flour,
20 loaves of bread -> ₦195 cost/loaf, ₦4,100 gross profit).

## Scope notes (MVP)

- Single business/workspace, no login screen. Every table already has a
  `businessId`, so real auth and a business switcher can be added later
  without a schema change.
- A recipe doubles as the sellable "Product" (spec's `Recipe` and `Product`
  entities are merged) - simpler for the MVP, since every sellable item needs
  a recipe to know its cost.
- Costing uses weighted-average cost (spec's P0 requirement); the schema
  keeps every purchase's own price/quantity so FIFO could be added later
  without losing history.
- Finished-goods stock is tracked per production batch (`unitsRemaining`), so
  a sale is always priced from a specific batch's frozen cost-per-unit.
