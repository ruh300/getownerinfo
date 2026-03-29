import { ObjectId, type Filter, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { adminRoles, canCreateListings } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import {
  listingCategories,
  seekerRequestDurations,
  type ListingCategory,
  type SeekerRequestDocument,
  type SeekerRequestDurationDays,
  type SeekerRequestStatus,
} from "@/lib/domain";
import {
  getFeeSettingsSummary,
  resolveSeekerPostFeeRwf,
  resolveSeekerViewTokenFeeRwf,
} from "@/lib/fee-settings/workflow";
import { createPaymentRecord } from "@/lib/payments/workflow";
import { createNotification, notifyUsersByRoles } from "@/lib/notifications/workflow";
import { getSeekerResponseCountsForRequester } from "@/lib/seeker-requests/responses";

export type BuyerSeekerRequestSummary = {
  id: string;
  title: string;
  category: ListingCategory;
  budgetMinRwf: number;
  budgetMaxRwf: number;
  quantityLabel: string;
  status: SeekerRequestStatus;
  approximateAreaLabel: string;
  district?: string;
  durationDays: SeekerRequestDurationDays;
  postedFeeRwf: number;
  responseCount: number;
  matchedResponderName?: string;
  closureNote?: string;
  expiresAt: string;
  createdAt: string;
  fulfilledAt: string | null;
  closedAt: string | null;
};

export type PublicSeekerRequestSummary = {
  id: string;
  title: string;
  category: ListingCategory;
  budgetMinRwf: number;
  budgetMaxRwf: number;
  quantityLabel: string;
  approximateAreaLabel: string;
  district?: string;
  durationDays: SeekerRequestDurationDays;
  viewTokenFeeRwf: number;
  createdAt: string;
  expiresAt: string;
};

export type PublicSeekerRequestDetail = PublicSeekerRequestSummary & {
  status: SeekerRequestStatus;
  detailsPreview: string;
  details: string;
  preferredContactTime: string;
  contactName: string;
  contactPhone: string;
  sector?: string;
  matchedResponseId: string | null;
  matchedResponderName: string | null;
  closureNote: string | null;
  fulfilledAt: string | null;
  closedAt: string | null;
};

function normalizeTextField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInteger(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed);
}

function getEffectiveStatus(request: Pick<SeekerRequestDocument, "status" | "expiresAt">, now = new Date()): SeekerRequestStatus {
  if (request.status === "active" && request.expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }

  return request.status;
}

function validateSeekerRequestInput(payload: Record<string, unknown>) {
  const category = normalizeTextField(payload.category);
  const title = normalizeTextField(payload.title);
  const details = normalizeTextField(payload.details);
  const quantityLabel = normalizeTextField(payload.quantityLabel);
  const preferredContactTime = normalizeTextField(payload.preferredContactTime);
  const approximateAreaLabel = normalizeTextField(payload.approximateAreaLabel);
  const district = normalizeTextField(payload.district);
  const sector = normalizeTextField(payload.sector);
  const budgetMinRwf = parsePositiveInteger(payload.budgetMinRwf);
  const budgetMaxRwf = parsePositiveInteger(payload.budgetMaxRwf);
  const durationDays = parsePositiveInteger(payload.durationDays);
  const errors: string[] = [];

  if (!listingCategories.includes(category as ListingCategory)) {
    errors.push("Choose a valid category for the seeker request.");
  }

  if (title.length < 8) {
    errors.push("Add a clearer seeker request title with at least 8 characters.");
  }

  if (details.length < 24) {
    errors.push("Provide more detail about what you are looking for.");
  }

  if (quantityLabel.length < 2) {
    errors.push("Specify the quantity or type you need.");
  }

  if (preferredContactTime.length < 4) {
    errors.push("Add a preferred contact time so owners know when to reach you.");
  }

  if (approximateAreaLabel.length < 3) {
    errors.push("Provide an approximate area or neighborhood.");
  }

  if (budgetMinRwf === null || budgetMinRwf < 0) {
    errors.push("Budget minimum must be a valid amount.");
  }

  if (budgetMaxRwf === null || budgetMaxRwf <= 0) {
    errors.push("Budget maximum must be a valid amount.");
  }

  if (budgetMinRwf !== null && budgetMaxRwf !== null && budgetMinRwf > budgetMaxRwf) {
    errors.push("Budget minimum cannot be greater than budget maximum.");
  }

  if (!seekerRequestDurations.includes(durationDays as SeekerRequestDurationDays)) {
    errors.push("Choose a valid seeker request duration.");
  }

  if (errors.length > 0) {
    return {
      ok: false as const,
      errors,
    };
  }

  return {
    ok: true as const,
    value: {
      category: category as ListingCategory,
      title,
      details,
      quantityLabel,
      preferredContactTime,
      approximateAreaLabel,
      district: district || undefined,
      sector: sector || undefined,
      budgetMinRwf: budgetMinRwf!,
      budgetMaxRwf: budgetMaxRwf!,
      durationDays: durationDays as SeekerRequestDurationDays,
    },
  };
}

function serializeBuyerRequest(
  request: WithId<SeekerRequestDocument>,
  responseCountMap: Map<string, number>,
): BuyerSeekerRequestSummary {
  return {
    id: request._id.toString(),
    title: request.title,
    category: request.category,
    budgetMinRwf: request.budgetMinRwf,
    budgetMaxRwf: request.budgetMaxRwf,
    quantityLabel: request.quantityLabel,
    status: getEffectiveStatus(request),
    approximateAreaLabel: request.approximateAreaLabel,
    district: request.district,
    durationDays: request.durationDays,
    postedFeeRwf: request.postedFeeRwf,
    responseCount: responseCountMap.get(request._id.toString()) ?? 0,
    matchedResponderName: request.matchedResponderName,
    closureNote: request.closureNote,
    expiresAt: request.expiresAt.toISOString(),
    createdAt: request.createdAt.toISOString(),
    fulfilledAt: request.fulfilledAt?.toISOString() ?? null,
    closedAt: request.closedAt?.toISOString() ?? null,
  };
}

function serializePublicRequest(request: WithId<SeekerRequestDocument>): PublicSeekerRequestSummary {
  return {
    id: request._id.toString(),
    title: request.title,
    category: request.category,
    budgetMinRwf: request.budgetMinRwf,
    budgetMaxRwf: request.budgetMaxRwf,
    quantityLabel: request.quantityLabel,
    approximateAreaLabel: request.approximateAreaLabel,
    district: request.district,
    durationDays: request.durationDays,
    viewTokenFeeRwf: request.viewTokenFeeRwf,
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt.toISOString(),
  };
}

function serializePublicRequestDetail(request: WithId<SeekerRequestDocument>): PublicSeekerRequestDetail {
  const detailsPreview =
    request.details.length > 180 ? `${request.details.slice(0, 177).trimEnd()}...` : request.details;

  return {
    ...serializePublicRequest(request),
    status: getEffectiveStatus(request),
    detailsPreview,
    details: request.details,
    preferredContactTime: request.preferredContactTime,
    contactName: request.contactName,
    contactPhone: request.contactPhone,
    sector: request.sector,
    matchedResponseId: request.matchedResponseId?.toString() ?? null,
    matchedResponderName: request.matchedResponderName ?? null,
    closureNote: request.closureNote ?? null,
    fulfilledAt: request.fulfilledAt?.toISOString() ?? null,
    closedAt: request.closedAt?.toISOString() ?? null,
  };
}

export async function createSeekerRequestForSession(session: AuthSession, payload: Record<string, unknown>) {
  if (session.user.role !== "buyer") {
    throw new Error("Only buyer accounts can create seeker requests right now.");
  }

  const user = await ensureUserRecord(session);
  const contactPhone = user.phone ?? session.user.phone?.trim();

  if (!contactPhone) {
    throw new Error("A phone number is required before posting a seeker request.");
  }

  const validation = validateSeekerRequestInput(payload);

  if (!validation.ok) {
    return validation;
  }

  const seekerRequests = await getCollection("seekerRequests");
  const auditLogs = await getCollection("auditLogs");
  const now = new Date();
  const feeSettings = await getFeeSettingsSummary();
  const postedFeeRwf = resolveSeekerPostFeeRwf(feeSettings, validation.value.durationDays);
  const expiresAt = new Date(now.getTime() + validation.value.durationDays * 24 * 60 * 60 * 1000);
  const requestDocument: Omit<SeekerRequestDocument, "_id"> = {
    requesterUserId: user._id,
    category: validation.value.category,
    title: validation.value.title,
    details: validation.value.details,
    budgetMinRwf: validation.value.budgetMinRwf,
    budgetMaxRwf: validation.value.budgetMaxRwf,
    quantityLabel: validation.value.quantityLabel,
    preferredContactTime: validation.value.preferredContactTime,
    status: "active",
    durationDays: validation.value.durationDays,
    approximateAreaLabel: validation.value.approximateAreaLabel,
    district: validation.value.district,
    sector: validation.value.sector,
    contactName: user.fullName,
    contactPhone,
    postedFeeRwf,
    viewTokenFeeRwf: resolveSeekerViewTokenFeeRwf(feeSettings),
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };
  const insertResult = await seekerRequests.insertOne(requestDocument);

  await createPaymentRecord({
    userId: user._id,
    seekerRequestId: insertResult.insertedId,
    amountRwf: postedFeeRwf,
    purpose: "seeker_post_fee",
    referencePrefix: "SEEK",
    metadata: {
      flow: "prototype_seeker_request_post",
      category: requestDocument.category,
      durationDays: requestDocument.durationDays,
    },
  });

  await auditLogs.insertOne({
    actorUserId: user._id,
    entityType: "seeker_request",
    entityId: insertResult.insertedId.toString(),
    action: "seeker_request_created",
    metadata: {
      category: requestDocument.category,
      durationDays: requestDocument.durationDays,
      postedFeeRwf,
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: user._id,
    kind: "seeker_request_created",
    severity: "success",
    title: "Seeker request posted",
    body: `${requestDocument.title} is now live on the demand board.`,
    entityType: "seeker_request",
    entityId: insertResult.insertedId.toString(),
    link: "/dashboard#notifications",
  });

  await notifyUsersByRoles(adminRoles, {
    kind: "seeker_request_created",
    severity: "info",
    title: "New seeker request posted",
    body: `${requestDocument.title} is now visible on the demand board.`,
    entityType: "seeker_request",
    entityId: insertResult.insertedId.toString(),
    link: "/admin#notifications",
  });

  return {
    ok: true as const,
    request: {
      ...requestDocument,
      _id: insertResult.insertedId,
    },
  };
}

export async function getBuyerSeekerRequestsForUser(requesterUserId: ObjectId): Promise<BuyerSeekerRequestSummary[]> {
  const seekerRequests = await getCollection("seekerRequests");
  const [requests, responseCountMap] = await Promise.all([
    seekerRequests
    .find({
      requesterUserId,
    })
    .sort({ createdAt: -1 })
    .limit(8)
      .toArray(),
    getSeekerResponseCountsForRequester(requesterUserId),
  ]);

  return requests.map((request) => serializeBuyerRequest(request, responseCountMap));
}

export async function getBuyerSeekerRequestsForSession(session: AuthSession): Promise<BuyerSeekerRequestSummary[]> {
  const user = await ensureUserRecord(session);

  return getBuyerSeekerRequestsForUser(user._id);
}

export async function getPublicSeekerRequests({
  query,
  category,
}: {
  query?: string;
  category?: string;
}): Promise<PublicSeekerRequestSummary[]> {
  const seekerRequests = await getCollection("seekerRequests");
  const normalizedQuery = query?.trim();
  const normalizedCategory = category?.trim();
  const now = new Date();
  const filter: Filter<SeekerRequestDocument> = {
    status: "active",
    expiresAt: { $gt: now },
  };

  if (normalizedCategory && listingCategories.includes(normalizedCategory as ListingCategory)) {
    filter.category = normalizedCategory as ListingCategory;
  }

  if (normalizedQuery) {
    filter.$or = [
      { title: { $regex: normalizedQuery, $options: "i" } },
      { details: { $regex: normalizedQuery, $options: "i" } },
      { approximateAreaLabel: { $regex: normalizedQuery, $options: "i" } },
      { quantityLabel: { $regex: normalizedQuery, $options: "i" } },
    ];
  }

  const requests = await seekerRequests.find(filter).sort({ createdAt: -1 }).limit(24).toArray();

  return requests.map(serializePublicRequest);
}

export async function getPublicSeekerRequestDetail(requestId: string) {
  if (!ObjectId.isValid(requestId)) {
    return null;
  }

  const seekerRequests = await getCollection("seekerRequests");
  const request = await seekerRequests.findOne({
    _id: new ObjectId(requestId),
    status: "active",
    expiresAt: { $gt: new Date() },
  });

  return request ? serializePublicRequestDetail(request) : null;
}

export async function getSeekerRequestDetailForViewer(session: AuthSession | null, requestId: string) {
  if (!ObjectId.isValid(requestId)) {
    return null;
  }

  const seekerRequests = await getCollection("seekerRequests");
  const seekerRequestUnlocks = await getCollection("seekerRequestUnlocks");
  const requestObjectId = new ObjectId(requestId);
  const request = await seekerRequests.findOne({
    _id: requestObjectId,
  });

  if (!request) {
    return null;
  }

  const isPubliclyVisible = request.status === "active" && request.expiresAt > new Date();

  if (isPubliclyVisible) {
    return serializePublicRequestDetail(request);
  }

  if (!session) {
    return null;
  }

  const user = await ensureUserRecord(session);

  if (request.requesterUserId.equals(user._id)) {
    return serializePublicRequestDetail(request);
  }

  if (!canCreateListings(session.user.role)) {
    return null;
  }

  const unlock = await seekerRequestUnlocks.findOne({
    userId: user._id,
    seekerRequestId: requestObjectId,
  });

  return unlock ? serializePublicRequestDetail(request) : null;
}
