import { ListingWizard } from "@/components/listings/listing-wizard";
import { requireSession } from "@/lib/auth/session";
import { listingEditorRoles } from "@/lib/auth/types";
import { getFeeSettingsSummary } from "@/lib/fee-settings/workflow";

export default async function NewListingPage() {
  const session = await requireSession({
    roles: listingEditorRoles,
    redirectTo: "/sign-in?next=/listings/new",
  });
  const feeSettings = await getFeeSettingsSummary();

  return <ListingWizard signedInUser={session.user} feeSettings={feeSettings} />;
}
