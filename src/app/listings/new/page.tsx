import { ListingWizard } from "@/components/listings/listing-wizard";
import { requireSession } from "@/lib/auth/session";
import { listingEditorRoles } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCommissionGuardDataForOwner } from "@/lib/commissions/workflow";
import { getFeeSettingsSummary } from "@/lib/fee-settings/workflow";
import { getPenaltyGuardDataForOwner } from "@/lib/penalties/workflow";

export default async function NewListingPage() {
  const session = await requireSession({
    roles: listingEditorRoles,
    redirectTo: "/sign-in?next=/listings/new",
  });
  const owner = await ensureUserRecord(session);
  const [feeSettings, commissionGuard, penaltyGuard] = await Promise.all([
    getFeeSettingsSummary(),
    getCommissionGuardDataForOwner(owner._id),
    getPenaltyGuardDataForOwner(owner._id),
  ]);

  return (
    <ListingWizard
      signedInUser={session.user}
      feeSettings={feeSettings}
      commissionGuard={commissionGuard}
      penaltyGuard={penaltyGuard}
    />
  );
}
