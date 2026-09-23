import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";

export default async function Home() {
  const business = await requireCurrentBusiness();
  redirect(business ? "/dashboard" : "/onboarding");
}
