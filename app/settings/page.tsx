import { redirect } from "next/navigation";
import Link from "next/link";
import { requireCurrentBusiness } from "@/lib/current-business";
import { Card, CardTitle, PageHeader, Field, Input, Select, Button } from "@/components/ui";
import { updateBusinessAction } from "./actions";

const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "America/New_York",
  "UTC",
];

export default async function SettingsPage() {
  const business = await requireCurrentBusiness();
  if (!business) redirect("/onboarding");

  const action = updateBusinessAction.bind(null, business.id);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Settings" description="Business profile and preferences." />
      <Card>
        <CardTitle>Business profile</CardTitle>
        <form action={action} className="space-y-4">
          <Field label="Business name">
            <Input name="name" defaultValue={business.name} required />
          </Field>
          <Field label="Currency">
            <Select name="currency" defaultValue={business.currency}>
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
              <option value="KES">KES (KSh)</option>
              <option value="GHS">GHS (GH₵)</option>
              <option value="ZAR">ZAR (R)</option>
            </Select>
          </Field>
          <Field label="Timezone">
            <Select name="timezone" defaultValue={business.timezone}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" className="w-full">
            Save changes
          </Button>
        </form>
      </Card>
      <div className="mt-4 text-center">
        <Link href="/audit" className="text-sm text-zinc-500 hover:text-zinc-900">
          View audit / activity history →
        </Link>
      </div>
    </div>
  );
}
