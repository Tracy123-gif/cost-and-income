import { getFirstBusiness } from "./services/business";

/**
 * MVP simplification: this build supports a single business/workspace with no login screen
 * (spec section 3 asks the data model to be *ready* for multi-business and multi-user later,
 * not that the UI has to ship it). Every table already carries a businessId, so adding real
 * auth and a business switcher later does not require touching the schema.
 */
export async function requireCurrentBusiness() {
  const business = await getFirstBusiness();
  if (!business) return null;
  return business;
}
