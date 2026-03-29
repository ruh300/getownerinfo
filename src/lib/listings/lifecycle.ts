import type { ListingStatus } from "@/lib/domain";

const listingLifecycleTransitions: Partial<Record<ListingStatus, ListingStatus[]>> = {
  active: ["under_negotiation", "sold", "rented", "not_concluded", "expired"],
  under_negotiation: ["active", "sold", "rented", "not_concluded"],
  not_concluded: ["active", "expired"],
  expired: ["active"],
};

export function getAllowedNextListingStatuses(status: ListingStatus): ListingStatus[] {
  return listingLifecycleTransitions[status] ?? [];
}

export function canManageListingLifecycle(status: ListingStatus) {
  return getAllowedNextListingStatuses(status).length > 0;
}

export function isListingPubliclyVisible(status: ListingStatus) {
  return status === "active";
}
