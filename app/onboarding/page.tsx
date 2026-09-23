import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/current-business";
import { Card, Field, Input, Select, Button } from "@/components/ui";
import { createBusinessAction } from "./actions";

export default async function OnboardingPage() {
  const existing = await requireCurrentBusiness();
  if (existing) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-2xl font-semibold text-zinc-900">Let&apos;s set up your business</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Takes under two minutes: name your business, then add your first ingredient and recipe.
      </p>
      <Card className="mt-6">
        <form action={createBusinessAction} className="space-y-4">
          <Field label="Business name">
            <Input name="name" placeholder="e.g. Amaka's Parfait Corner" required autoFocus />
          </Field>
          <Field label="Currency">
            <Select name="currency" defaultValue="NGN">
              <option value="NGN">NGN (₦) - Nigerian Naira</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="KES">KES (KSh) - Kenyan Shilling</option>
              <option value="GHS">GHS (GH₵) - Ghanaian Cedi</option>
              <option value="ZAR">ZAR (R) - South African Rand</option>
            </Select>
          </Field>
          <Button type="submit" className="w-full">
            Create business
          </Button>
        </form>
      </Card>
    </div>
  );
}
