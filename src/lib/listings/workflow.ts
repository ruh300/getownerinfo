import { ObjectId, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getOwnerInquiryFeedForUser, type OwnerInquirySummary } from "@/lib/chat/workflow";
import { getCollection } from "@/lib/data/collections";
import type { ListingDocument, ListingDraftDocument, ListingModel } from "@/lib/domain";
import { validateListingDraftInput } from "@/lib/listings/drafts";

export type OwnerDraftSummary = {
  id: string;
  title: string;
  category: ListingDraftDocument["category"];
  requestedModel: ListingDraftDocument["requestedModel"];
  recommendedModel: ListingModel;
  priceRwf: number;
  units: number;
  mediaCount: number;
  hasOwnershipProof: boolean;
  updatedAt: string;
  submittedAt: string | null;
  submittedListingId: string | null;
};

export type OwnerListingSummary = {
  id: string;
  title: string;
  category: ListingDocument["category"];
  model: ListingDocument["model"];
  status: ListingDocument["status"];
  verificationStatus: ListingDocument["verificationStatus"];
  priceRwf: number;
  units: number;
  updatedAt: string;
  submittedAt: string;
  reviewNote: string | null;
};

export type OwnerWorkspaceData = {
  stats: {
    draftCount: number;
    pendingCount: number;
    activeCount: number;
    rejectedCount: number;
  };
  drafts: OwnerDraftSummary[];
  listings: OwnerListingSummary[];
  inquiries: OwnerInquirySummary[];
};

export type AdminReviewSummary = {
  id: string;
  title: string;
  category: ListingDocument["category"];
  model: ListingDocument["model"];
  ownerName: string;
  ownerPhone: string;
  ownerType: ListingDocument["ownerType"];
  priceRwf: number;
  units: number;
  mediaCount: number;
  hasOwnershipProof: boolean;
  submittedAt: string;
  updatedAt: string;
  reviewNote: string | null;
};

export type AdminDecisionSummary = {
  id: string;
  title: string;
  status: ListingDocument["status"];
  verificationStatus: ListingDocument["verificationStatus"];
  ownerName: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type AdminWorkspaceData = {
  stats: {
    pendingCount: number;
    activeCount: number;
    rejectedCount: number;
    totalListingCount: number;
  };
  reviewQueue: AdminReviewSummary[];
  recentDecisions: AdminDecisionSummary[];
};

const defaultListingTokenFeeRwf = 10_000;

function parseObjectId(value: string) {
  if (!ObjectId.isValid(value)) {
    throw new Error("Invalid identifier.");
  }

  return new ObjectId(value);
}

function selectListingModel(draft: ListingDraftDocument): ListingModel {
  return draft.eligibility.eligibleForModelA && draft.requestedModel === "A" ? "A" : "B";
}

function serializeDraft(draft: WithId<ListingDraftDocument>): OwnerDraftSummary {
  return {
    id: draft._id.toString(),
    title: draft.title,
    category: draft.category,
    requestedModel: draft.requestedModel,
    recommendedModel: selectListingModel(draft),
    priceRwf: draft.priceRwf,
    units: draft.units,
    mediaCount: draft.media.length,
    hasOwnershipProof: Boolean(draft.ownershipProof),
    updatedAt: draft.updatedAt.toISOString(),
    submittedAt: draft.submittedAt?.toISOString() ?? null,
    submittedListingId: draft.submittedListingId?.toString() ?? null,
  };
}

function serializeListing(listing: WithId<ListingDocument>): OwnerListingSummary {
  return {
    id: listing._id.toString(),
    title: listing.title,
    category: listing.category,
    model: listing.model,
    status: listing.status,
    verificationStatus: listing.verificationStatus,
    priceRwf: listing.priceRwf,
    units: listing.units,
    updatedAt: listing.updatedAt.toISOString(),
    submittedAt: listing.submittedAt.toISOString(),
    reviewNote: listing.reviewNote ?? null,
  };
}

function serializeAdminReview(listing: WithId<ListingDocument>): AdminReviewSummary {
  return {
    id: listing._id.toString(),
    title: listing.title,
    category: listing.category,
    model: listing.model,
    ownerName: listing.ownerContact.fullName,
    ownerPhone: listing.ownerContact.phone,
    ownerType: listing.ownerType,
    priceRwf: listing.priceRwf,
    units: listing.units,
    mediaCount: listing.media.length,
    hasOwnershipProof: Boolean(listing.ownershipProof),
    submittedAt: listing.submittedAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    reviewNote: listing.reviewNote ?? null,
  };
}

function serializeAdminDecision(listing: WithId<ListingDocument>): AdminDecisionSummary {
  return {
    id: listing._id.toString(),
    title: listing.title,
    status: listing.status,
    verificationStatus: listing.verificationStatus,
    ownerName: listing.ownerContact.fullName,
    reviewedAt: listing.reviewedAt?.toISOString() ?? null,
    reviewNote: listing.reviewNote ?? null,
  };
}

export async function saveDraftForSession(session: AuthSession, payload: Record<string, unknown>) {
  const user = await ensureUserRecord(session);
  const listingDrafts = await getCollection("listingDrafts");
  const draftId = typeof payload.draftId === "string" ? payload.draftId : "";
  const validation = validateListingDraftInput(payload);

  if (!validation.ok) {
    return validation;
  }

  const now = new Date();

  if (draftId) {
    const updatedDraft = await listingDrafts.findOneAndUpdate(
      {
        _id: parseObjectId(draftId),
        ownerUserId: user._id,
      },
      {
        $set: {
          ...validation.value,
          ownerUserId: user._id,
          updatedAt: now,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!updatedDraft) {
      return {
        ok: false as const,
        errors: ["The selected draft could not be found for this signed-in user."],
      };
    }

    return {
      ok: true as const,
      draft: updatedDraft,
      created: false,
    };
  }

  const draftDocument: Omit<ListingDraftDocument, "_id"> = {
    ...validation.value,
    ownerUserId: user._id,
    createdAt: now,
    updatedAt: now,
  };

  const result = await listingDrafts.insertOne(draftDocument);

  return {
    ok: true as const,
    draft: {
      ...draftDocument,
      _id: result.insertedId,
    },
    created: true,
  };
}

export async function submitDraftForReview(session: AuthSession, draftId: string) {
  const user = await ensureUserRecord(session);
  const listingDrafts = await getCollection("listingDrafts");
  const listings = await getCollection("listings");
  const auditLogs = await getCollection("auditLogs");
  const now = new Date();
  const draft = await listingDrafts.findOne({
    _id: parseObjectId(draftId),
    ownerUserId: user._id,
  });

  if (!draft) {
    throw new Error("The selected draft could not be found.");
  }

  const listingPayload: Omit<ListingDocument, "_id"> = {
    ownerUserId: user._id,
    ownerContact: draft.ownerContact,
    ownerType: draft.ownerType,
    category: draft.category,
    title: draft.title,
    description: draft.description,
    priceRwf: draft.priceRwf,
    units: draft.units,
    model: selectListingModel(draft),
    status: "pending_approval",
    tokenFeeEnabled: draft.tokenFeeEnabled,
    tokenFeeRwf: draft.tokenFeeEnabled ? defaultListingTokenFeeRwf : undefined,
    durationMonths: draft.durationMonths,
    location: draft.location,
    media: draft.media,
    ownershipProof: draft.ownershipProof,
    features: draft.features,
    eligibility: draft.eligibility,
    verificationStatus: "pending",
    submittedAt: now,
    createdAt: draft.createdAt,
    updatedAt: now,
  };

  let listingId: ObjectId;

  if (draft.submittedListingId) {
    const updatedListing = await listings.findOneAndUpdate(
      {
        _id: draft.submittedListingId,
        ownerUserId: user._id,
      },
      {
        $set: {
          ...listingPayload,
          reviewedAt: undefined,
          reviewedByUserId: undefined,
          reviewNote: undefined,
          activatedAt: undefined,
          rejectedAt: undefined,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!updatedListing) {
      throw new Error("Could not update the previously submitted listing.");
    }

    listingId = updatedListing._id;
  } else {
    const insertResult = await listings.insertOne(listingPayload);
    listingId = insertResult.insertedId;
  }

  await listingDrafts.updateOne(
    {
      _id: draft._id,
    },
    {
      $set: {
        updatedAt: now,
        submittedAt: now,
        submittedListingId: listingId,
      },
    },
  );

  await auditLogs.insertOne({
    actorUserId: user._id,
    entityType: "listing",
    entityId: listingId.toString(),
    action: "listing_submitted_for_review",
    metadata: {
      draftId: draft._id.toString(),
      model: listingPayload.model,
      verificationStatus: "pending",
    },
    createdAt: now,
    updatedAt: now,
  });

  return {
    listingId: listingId.toString(),
    status: listingPayload.status,
  };
}

export async function getOwnerWorkspaceData(session: AuthSession): Promise<OwnerWorkspaceData> {
  const user = await ensureUserRecord(session);
  const listingDrafts = await getCollection("listingDrafts");
  const listings = await getCollection("listings");
  const [drafts, ownedListings, inquiries] = await Promise.all([
    listingDrafts
      .find({
        ownerUserId: user._id,
      })
      .sort({ updatedAt: -1 })
      .limit(8)
      .toArray(),
    listings
      .find({
        ownerUserId: user._id,
      })
      .sort({ updatedAt: -1 })
      .limit(8)
      .toArray(),
    getOwnerInquiryFeedForUser(user._id),
  ]);

  return {
    stats: {
      draftCount: drafts.length,
      pendingCount: ownedListings.filter((listing) => listing.status === "pending_approval").length,
      activeCount: ownedListings.filter((listing) => listing.status === "active").length,
      rejectedCount: ownedListings.filter((listing) => listing.status === "rejected").length,
    },
    drafts: drafts.map(serializeDraft),
    listings: ownedListings.map(serializeListing),
    inquiries,
  };
}

export async function getAdminWorkspaceData(): Promise<AdminWorkspaceData> {
  const listings = await getCollection("listings");
  const [reviewQueue, recentDecisions, pendingCount, activeCount, rejectedCount, totalListingCount] = await Promise.all([
    listings
      .find({
        status: "pending_approval",
      })
      .sort({ submittedAt: 1 })
      .limit(12)
      .toArray(),
    listings
      .find({
        status: { $in: ["active", "rejected"] },
      })
      .sort({ reviewedAt: -1, updatedAt: -1 })
      .limit(8)
      .toArray(),
    listings.countDocuments({ status: "pending_approval" }),
    listings.countDocuments({ status: "active" }),
    listings.countDocuments({ status: "rejected" }),
    listings.countDocuments({}),
  ]);

  return {
    stats: {
      pendingCount,
      activeCount,
      rejectedCount,
      totalListingCount,
    },
    reviewQueue: reviewQueue.map(serializeAdminReview),
    recentDecisions: recentDecisions.map(serializeAdminDecision),
  };
}

export async function applyListingReviewDecision(
  session: AuthSession,
  listingId: string,
  decision: "approve" | "reject",
  reviewNote?: string,
) {
  const reviewer = await ensureUserRecord(session);
  const listings = await getCollection("listings");
  const auditLogs = await getCollection("auditLogs");
  const now = new Date();
  const nextStatus = decision === "approve" ? "active" : "rejected";
  const nextVerificationStatus = decision === "approve" ? "approved" : "rejected";
  const trimmedNote = reviewNote?.trim() || undefined;
  const listing = await listings.findOneAndUpdate(
    {
      _id: parseObjectId(listingId),
    },
    {
      $set: {
        status: nextStatus,
        verificationStatus: nextVerificationStatus,
        reviewedAt: now,
        reviewedByUserId: reviewer._id,
        reviewNote: trimmedNote,
        updatedAt: now,
        activatedAt: decision === "approve" ? now : undefined,
        rejectedAt: decision === "reject" ? now : undefined,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!listing) {
    throw new Error("The selected listing could not be found.");
  }

  await auditLogs.insertOne({
    actorUserId: reviewer._id,
    entityType: "listing",
    entityId: listing._id.toString(),
    action: decision === "approve" ? "listing_approved" : "listing_rejected",
    metadata: {
      reviewNote: trimmedNote,
      ownerUserId: listing.ownerUserId.toString(),
    },
    createdAt: now,
    updatedAt: now,
  });

  return {
    listingId: listing._id.toString(),
    status: listing.status,
    verificationStatus: listing.verificationStatus,
  };
}
