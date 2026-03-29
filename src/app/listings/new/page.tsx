import { ListingWizard } from "@/components/listings/listing-wizard";
import { requireSession } from "@/lib/auth/session";
import { listingEditorRoles } from "@/lib/auth/types";

export default async function NewListingPage() {
  const session = await requireSession({
    roles: listingEditorRoles,
    redirectTo: "/sign-in?next=/listings/new",
  });

  return <ListingWizard signedInUser={session.user} />;
}
