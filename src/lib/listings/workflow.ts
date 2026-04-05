import { ObjectId, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { adminRoles } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import {
  assertNoOverdueCommissionBlock,
  createCommissionCaseForListingOutcome,
  publishCommissionCaseCreated,
} from "@/lib/commissions/workflow";
import { getOwnerInquiryFeedForUser, type OwnerInquirySummary } from "@/lib/chat/workflow";
import { getCollection } from "@/lib/data/collections";
import type {
  AuditLogDocument,
  CommissionCaseDocument,
  ListingDocument,
  ListingDraftDocument,
  ListingModel,
  ListingStatus,
  PenaltyDocument,
  UserDocument,
  UserRole,
} from "@/lib/domain";
import { getFeeSettingsSummary, resolveListingTokenFeeRwf } from "@/lib/fee-settings/workflow";
import { humanizeEnum } from "@/lib/formatting/text";
import { validateListingDraftInput } from "@/lib/listings/drafts";
import { canManageListingLifecycle, getAllowedNextListingStatuses, isListingPubliclyVisible } from "@/lib/listings/lifecycle";
import { createNotification, notifyUsersByIds, notifyUsersByRoles } from "@/lib/notifications/workflow";
import { assertNoUnpaidPenaltyBlock, resolvePenaltyEffectiveStatus } from "@/lib/penalties/workflow";
import {
  getSeekerMatchConversationFeedForUser,
  type SeekerMatchConversationSummary,
} from "@/lib/seeker-requests/messaging";

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
  lifecycleActionCount: number;
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
  matchedSeekerConversations: SeekerMatchConversationSummary[];
};

export type AdminReviewSummary = {
  id: string;
  title: string;
  category: ListingDocument["category"];
  model: ListingDocument["model"];
  ownerUserId: string;
  ownerName: string;
  ownerPhone: string;
  ownerRole: UserRole | null;
  ownerType: ListingDocument["ownerType"];
  priceRwf: number;
  units: number;
  mediaCount: number;
  hasOwnershipProof: boolean;
  submittedAt: string;
  updatedAt: string;
  reviewNote: string | null;
  internalNoteCount: number;
  latestInternalNote: {
    actorName: string;
    actorRole: UserRole | null;
    note: string;
    createdAt: string;
  } | null;
  ownerRisk: {
    totalListingCount: number;
    activeListingCount: number;
    rejectedListingCount: number;
    notConcludedCount: number;
    dueCommissionCount: number;
    overdueCommissionCount: number;
    unpaidPenaltyCount: number;
    unpaidBalanceRwf: number;
    riskFlags: string[];
  };
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

export type AdminAuditSummary = {
  id: string;
  action: string;
  entityType: AuditLogDocument["entityType"];
  entityId: string;
  actorName: string;
  actorRole: UserRole | null;
  createdAt: string;
  metadataSummary: string | null;
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
  recentActivity: AdminAuditSummary[];
};

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
    lifecycleActionCount: getAllowedNextListingStatuses(listing.status).length,
  };
}

function buildOwnerRiskSummary(
  ownerUserId: string,
  owner: WithId<UserDocument> | null,
  ownerListings: WithId<ListingDocument>[],
  ownerCommissionCases: WithId<CommissionCaseDocument>[],
  ownerPenalties: WithId<PenaltyDocument>[],
) {
  const now = new Date();
  const activeListingCount = ownerListings.filter((listing) => listing.status === "active").length;
  const rejectedListingCount = ownerListings.filter((listing) => listing.status === "rejected").length;
  const notConcludedCount = ownerListings.filter((listing) => listing.status === "not_concluded").length;
  const dueCommissionCount = ownerCommissionCases.filter((commissionCase) => commissionCase.status === "due").length;
  const overdueCommissionCount = ownerCommissionCases.filter(
    (commissionCase) => commissionCase.status === "due" && commissionCase.dueAt.getTime() < now.getTime(),
  ).length;
  const unpaidPenaltyEntries = ownerPenalties.filter(
    (penalty) => resolvePenaltyEffectiveStatus(penalty, now) === "due" || resolvePenaltyEffectiveStatus(penalty, now) === "overdue",
  );
  const unpaidPenaltyCount = unpaidPenaltyEntries.length;
  const unpaidBalanceRwf = unpaidPenaltyEntries.reduce((total, penalty) => total + penalty.penaltyAmountRwf, 0);
  const riskFlags: string[] = [];

  if (notConcludedCount >= 3) {
    riskFlags.push("Repeated not concluded outcomes");
  }

  if (overdueCommissionCount > 0) {
    riskFlags.push("Overdue commission");
  }

  if (unpaidPenaltyCount > 0) {
    riskFlags.push("Unpaid penalties");
  }

  if (rejectedListingCount >= 3) {
    riskFlags.push("High rejection count");
  }

  return {
    ownerUserId,
    ownerRole: owner?.role ?? null,
    totalListingCount: ownerListings.length,
    activeListingCount,
    rejectedListingCount,
    notConcludedCount,
    dueCommissionCount,
    overdueCommissionCount,
    unpaidPenaltyCount,
    unpaidBalanceRwf,
    riskFlags,
  };
}

function serializeAdminReview(
  listing: WithId<ListingDocument>,
  owner: WithId<UserDocument> | null,
  ownerRisk: AdminReviewSummary["ownerRisk"],
  internalNoteSummary: {
    count: number;
    latest: AdminReviewSummary["latestInternalNote"];
  },
): AdminReviewSummary {
  return {
    id: listing._id.toString(),
    title: listing.title,
    category: listing.category,
    model: listing.model,
    ownerUserId: listing.ownerUserId.toString(),
    ownerName: listing.ownerContact.fullName,
    ownerPhone: listing.ownerContact.phone,
    ownerRole: owner?.role ?? null,
    ownerType: listing.ownerType,
    priceRwf: listing.priceRwf,
    units: listing.units,
    mediaCount: listing.media.length,
    hasOwnershipProof: Boolean(listing.ownershipProof),
    submittedAt: listing.submittedAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    reviewNote: listing.reviewNote ?? null,
    internalNoteCount: internalNoteSummary.count,
    latestInternalNote: internalNoteSummary.latest,
    ownerRisk,
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

function serializeMetadataValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(serializeMetadataValue).join(", ");
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function summarizeAuditMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return null;
  }

  const parts = Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 3)
    .map(([key, value]) => `${key.replace(/[_-]+/g, " ")}: ${serializeMetadataValue(value)}`);

  return parts.length > 0 ? parts.join(" / ") : null;
}

function serializeAdminAudit(log: WithId<AuditLogDocument>, actorMap: Map<string, WithId<UserDocument>>): AdminAuditSummary {
  const actor = log.actorUserId ? actorMap.get(log.actorUserId.toString()) : null;

  return {
    id: log._id.toString(),
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    actorName: actor?.fullName ?? (log.actorUserId ? "Unknown user" : "System"),
    actorRole: actor?.role ?? null,
    createdAt: log.createdAt.toISOString(),
    metadataSummary: summarizeAuditMetadata(log.metadata),
  };
}

function serializeAdminInternalNote(log: WithId<AuditLogDocument>, actorMap: Map<string, WithId<UserDocument>>) {
  const actor = log.actorUserId ? actorMap.get(log.actorUserId.toString()) : null;
  const note = typeof log.metadata?.note === "string" ? log.metadata.note : "No note recorded.";

  return {
    actorName: actor?.fullName ?? (log.actorUserId ? "Unknown user" : "System"),
    actorRole: actor?.role ?? null,
    note,
    createdAt: log.createdAt.toISOString(),
  };
}

export async function saveDraftForSession(session: AuthSession, payload: Record<string, unknown>) {
  const user = await ensureUserRecord(session);
  await assertNoUnpaidPenaltyBlock(user._id);
  await assertNoOverdueCommissionBlock(user._id);
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
  await assertNoUnpaidPenaltyBlock(user._id);
  await assertNoOverdueCommissionBlock(user._id);
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

  const listingModel = selectListingModel(draft);
  const feeSettings = draft.tokenFeeEnabled ? await getFeeSettingsSummary() : null;

  const listingPayload: Omit<ListingDocument, "_id"> = {
    ownerUserId: user._id,
    ownerContact: draft.ownerContact,
    ownerType: draft.ownerType,
    category: draft.category,
    title: draft.title,
    description: draft.description,
    priceRwf: draft.priceRwf,
    units: draft.units,
    model: listingModel,
    status: "pending_approval",
    tokenFeeEnabled: draft.tokenFeeEnabled,
    tokenFeeRwf:
      draft.tokenFeeEnabled && feeSettings
        ? resolveListingTokenFeeRwf(feeSettings, draft.category, listingModel)
        : undefined,
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

  await notifyUsersByRoles(adminRoles, {
    kind: "listing_submitted_for_review",
    severity: "info",
    title: "New listing submitted for review",
    body: `${draft.title} is waiting in the admin queue.`,
    entityType: "listing",
    entityId: listingId.toString(),
    link: "/admin",
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
  const [drafts, ownedListings, inquiries, matchedSeekerConversations] = await Promise.all([
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
    getSeekerMatchConversationFeedForUser(user._id),
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
    matchedSeekerConversations,
  };
}

export async function getAdminWorkspaceData(): Promise<AdminWorkspaceData> {
  const listings = await getCollection("listings");
  const auditLogs = await getCollection("auditLogs");
  const users = await getCollection("users");
  const commissionCases = await getCollection("commissionCases");
  const penalties = await getCollection("penalties");
  const [reviewQueue, recentDecisions, recentAuditLogs, pendingCount, activeCount, rejectedCount, totalListingCount] =
    await Promise.all([
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
    auditLogs
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
    listings.countDocuments({ status: "pending_approval" }),
    listings.countDocuments({ status: "active" }),
    listings.countDocuments({ status: "rejected" }),
    listings.countDocuments({}),
    ]);
  const reviewListingIds = reviewQueue.map((listing) => listing._id.toString());
  const reviewOwnerIds = [...new Set(reviewQueue.map((listing) => listing.ownerUserId.toString()))].map((id) => new ObjectId(id));
  const internalNotes =
    reviewListingIds.length > 0
      ? await auditLogs
          .find({
            entityType: "listing",
            entityId: { $in: reviewListingIds },
            action: "admin_internal_note_added",
          })
          .sort({ createdAt: -1 })
          .toArray()
      : [];
  const actorIds = [...new Set(recentAuditLogs.flatMap((log) => (log.actorUserId ? [log.actorUserId.toString()] : [])))].map(
    (id) => new ObjectId(id),
  );
  const internalNoteActorIds = [...new Set(internalNotes.flatMap((log) => (log.actorUserId ? [log.actorUserId.toString()] : [])))].map(
    (id) => new ObjectId(id),
  );
  const userIds = [
    ...new Set([
      ...reviewOwnerIds.map((id) => id.toString()),
      ...actorIds.map((id) => id.toString()),
      ...internalNoteActorIds.map((id) => id.toString()),
    ]),
  ].map((id) => new ObjectId(id));
  const [userDocuments, ownerListings, ownerCommissionCases, ownerPenalties] = await Promise.all([
    userIds.length > 0
      ? users
          .find({
            _id: { $in: userIds },
          })
          .toArray()
      : Promise.resolve([]),
    reviewOwnerIds.length > 0
      ? listings
          .find({
            ownerUserId: { $in: reviewOwnerIds },
          })
          .toArray()
      : Promise.resolve([]),
    reviewOwnerIds.length > 0
      ? commissionCases
          .find({
            ownerUserId: { $in: reviewOwnerIds },
          })
          .toArray()
      : Promise.resolve([]),
    reviewOwnerIds.length > 0
      ? penalties
          .find({
            ownerUserId: { $in: reviewOwnerIds },
          })
          .toArray()
      : Promise.resolve([]),
  ]);
  const userMap = new Map(userDocuments.map((user) => [user._id.toString(), user]));
  const actorMap = new Map(actorIds.map((id) => [id.toString(), userMap.get(id.toString())]).filter((entry): entry is [string, WithId<UserDocument>] => Boolean(entry[1])));
  const ownerListingsMap = new Map<string, WithId<ListingDocument>[]>();
  const ownerCommissionCasesMap = new Map<string, WithId<CommissionCaseDocument>[]>();
  const ownerPenaltiesMap = new Map<string, WithId<PenaltyDocument>[]>();
  const internalNotesMap = new Map<string, WithId<AuditLogDocument>[]>();

  for (const listing of ownerListings) {
    const key = listing.ownerUserId.toString();
    const bucket = ownerListingsMap.get(key);

    if (bucket) {
      bucket.push(listing);
    } else {
      ownerListingsMap.set(key, [listing]);
    }
  }

  for (const commissionCase of ownerCommissionCases) {
    const key = commissionCase.ownerUserId.toString();
    const bucket = ownerCommissionCasesMap.get(key);

    if (bucket) {
      bucket.push(commissionCase);
    } else {
      ownerCommissionCasesMap.set(key, [commissionCase]);
    }
  }

  for (const penalty of ownerPenalties) {
    const key = penalty.ownerUserId.toString();
    const bucket = ownerPenaltiesMap.get(key);

    if (bucket) {
      bucket.push(penalty);
    } else {
      ownerPenaltiesMap.set(key, [penalty]);
    }
  }

  for (const note of internalNotes) {
    const bucket = internalNotesMap.get(note.entityId);

    if (bucket) {
      bucket.push(note);
    } else {
      internalNotesMap.set(note.entityId, [note]);
    }
  }

  return {
    stats: {
      pendingCount,
      activeCount,
      rejectedCount,
      totalListingCount,
    },
    reviewQueue: reviewQueue.map((listing) => {
      const ownerUserId = listing.ownerUserId.toString();
      const owner = userMap.get(ownerUserId) ?? null;
      const ownerRisk = buildOwnerRiskSummary(
        ownerUserId,
        owner,
        ownerListingsMap.get(ownerUserId) ?? [],
        ownerCommissionCasesMap.get(ownerUserId) ?? [],
        ownerPenaltiesMap.get(ownerUserId) ?? [],
      );
      const noteEntries = internalNotesMap.get(listing._id.toString()) ?? [];

      return serializeAdminReview(listing, owner, ownerRisk, {
        count: noteEntries.length,
        latest: noteEntries.length > 0 ? serializeAdminInternalNote(noteEntries[0], userMap) : null,
      });
    }),
    recentDecisions: recentDecisions.map(serializeAdminDecision),
    recentActivity: recentAuditLogs.map((log) => serializeAdminAudit(log, actorMap)),
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

  await createNotification({
    userId: listing.ownerUserId,
    kind: decision === "approve" ? "listing_approved" : "listing_rejected",
    severity: decision === "approve" ? "success" : "warning",
    title: decision === "approve" ? "Listing approved" : "Listing needs revision",
    body:
      decision === "approve"
        ? `${listing.title} is now live in the marketplace.`
        : `${listing.title} was sent back for revision.${trimmedNote ? ` Note: ${trimmedNote}` : ""}`,
    entityType: "listing",
    entityId: listing._id.toString(),
    link: "/dashboard#notifications",
  });

  return {
    listingId: listing._id.toString(),
    status: listing.status,
    verificationStatus: listing.verificationStatus,
  };
}

export async function updateListingLifecycleStatus(
  session: AuthSession,
  listingId: string,
  nextStatus: ListingStatus,
  statusNote?: string,
  finalAmountRwf?: number,
) {
  const actor = await ensureUserRecord(session);
  const listings = await getCollection("listings");
  const tokenUnlocks = await getCollection("tokenUnlocks");
  const auditLogs = await getCollection("auditLogs");
  const listingObjectId = parseObjectId(listingId);
  const listing = await listings.findOne({
    _id: listingObjectId,
    ownerUserId: actor._id,
  });

  if (!listing) {
    throw new Error("The selected listing could not be found for this owner account.");
  }

  if (listing.verificationStatus !== "approved") {
    throw new Error("Only approved listings can enter lifecycle tracking.");
  }

  if (!canManageListingLifecycle(listing.status)) {
    throw new Error("This listing is already in a final lifecycle state.");
  }

  if (!getAllowedNextListingStatuses(listing.status).includes(nextStatus)) {
    throw new Error(`You cannot move a listing from ${humanizeEnum(listing.status)} to ${humanizeEnum(nextStatus)}.`);
  }

  const requiresCommissionCase = listing.model === "A" && (nextStatus === "sold" || nextStatus === "rented");
  const normalizedFinalAmountRwf =
    typeof finalAmountRwf === "number" && Number.isInteger(finalAmountRwf) ? finalAmountRwf : undefined;

  if (requiresCommissionCase && (!normalizedFinalAmountRwf || normalizedFinalAmountRwf <= 0)) {
    throw new Error(`Report the final ${nextStatus === "sold" ? "sale" : "rent"} amount before closing a Model A listing.`);
  }

  const reportedFinalAmountRwf = requiresCommissionCase ? normalizedFinalAmountRwf! : undefined;

  const now = new Date();
  const trimmedStatusNote = statusNote?.trim() || undefined;
  const updatedListing = await listings.findOneAndUpdate(
    {
      _id: listingObjectId,
      ownerUserId: actor._id,
    },
    {
      $set: {
        status: nextStatus,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!updatedListing) {
    throw new Error("Could not update the selected listing status.");
  }

  let commissionCaseId: string | null = null;

  if (requiresCommissionCase) {
    try {
      const commissionCase = await createCommissionCaseForListingOutcome({
        listing: updatedListing,
        reportedByUserId: actor._id,
        outcomeStatus: nextStatus,
        finalAmountRwf: reportedFinalAmountRwf!,
        statusNote: trimmedStatusNote,
      });
      commissionCaseId = commissionCase._id.toString();
      await publishCommissionCaseCreated({
        commissionCase,
        listing: updatedListing,
        actorUserId: actor._id,
      });
    } catch (error) {
      const reverted = await listings.updateOne(
        {
          _id: listingObjectId,
          ownerUserId: actor._id,
          status: nextStatus,
        },
        {
          $set: {
            status: listing.status,
            updatedAt: new Date(),
          },
        },
      );

      if (reverted.modifiedCount === 0) {
        throw new Error(
          `The listing outcome could not be finalized cleanly after commission generation failed. Please contact admin support. ${
            error instanceof Error ? error.message : ""
          }`.trim(),
        );
      }

      throw error;
    }
  }

  await auditLogs.insertOne({
    actorUserId: actor._id,
    entityType: "listing",
    entityId: listingId,
    action: "listing_status_updated",
    metadata: {
      previousStatus: listing.status,
      nextStatus,
      statusNote: trimmedStatusNote,
      finalAmountRwf: reportedFinalAmountRwf,
      commissionCaseId,
    },
    createdAt: now,
    updatedAt: now,
  });

  await notifyUsersByRoles(adminRoles, {
    kind: "listing_status_changed",
    severity: nextStatus === "active" ? "success" : "warning",
    title: "Listing lifecycle updated",
    body:
      commissionCaseId && reportedFinalAmountRwf
        ? `${updatedListing.title} moved from ${humanizeEnum(listing.status)} to ${humanizeEnum(nextStatus)} and generated a commission invoice from ${reportedFinalAmountRwf.toLocaleString("en-RW")} RWF.`
        : `${updatedListing.title} moved from ${humanizeEnum(listing.status)} to ${humanizeEnum(nextStatus)}.`,
    entityType: "listing",
    entityId: listingId,
    link: "/admin#notifications",
  });

  const unlockRecords = await tokenUnlocks
    .find({
      listingId: listingObjectId,
    })
    .project({ userId: 1 })
    .toArray();
  const buyerUserIds = unlockRecords
    .map((record) => record.userId)
    .filter((userId) => !userId.equals(actor._id));

  if (buyerUserIds.length > 0) {
    await notifyUsersByIds(buyerUserIds, {
      kind: "listing_status_changed",
      severity: isListingPubliclyVisible(nextStatus) ? "success" : "warning",
      title: "Listing status changed",
      body: `${updatedListing.title} is now ${humanizeEnum(nextStatus)}.${trimmedStatusNote ? ` Note: ${trimmedStatusNote}` : ""}`,
      entityType: "listing",
      entityId: listingId,
      link: isListingPubliclyVisible(nextStatus) ? `/listings/${listingId}` : "/dashboard#notifications",
    });
  }

  return {
    listingId,
    previousStatus: listing.status,
    status: updatedListing.status,
    commissionCaseId,
  };
}
