import { randomBytes } from "node:crypto";

import { ObjectId, type WithId } from "mongodb";

import { adminRoles } from "@/lib/auth/types";
import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import { getServerEnv } from "@/lib/env";
import {
  listingCategories,
  paymentPurposes,
  paymentStatuses,
  seekerRequestDurations,
} from "@/lib/domain";
import type {
  AuditLogDocument,
  ListingCategory,
  PaymentDocument,
  PaymentPurpose,
  PaymentStatus,
  SeekerRequestDocument,
  SeekerRequestDurationDays,
  SeekerRequestUnlockDocument,
  TokenUnlockDocument,
  UserDocument,
} from "@/lib/domain";
import { createNotification, notifyUsersByRoles } from "@/lib/notifications/workflow";
import { assertAfripayServerCredentials, getAfripayGatewayUrl } from "@/lib/payments/afripay";

const checkoutLifetimeMs = 30 * 60 * 1000;
const defaultAppUrl = "http://localhost:3000";

export type CreatePaymentRecordInput = {
  userId: ObjectId;
  amountRwf: number;
  purpose: PaymentPurpose;
  listingId?: ObjectId;
  seekerRequestId?: ObjectId;
  status?: PaymentStatus;
  providerReference?: string;
  providerTransactionId?: string;
  metadata?: Record<string, unknown>;
  referencePrefix?: string;
  relatedEntityId?: string;
  returnPath?: string;
  auditActorUserId?: ObjectId;
};

export type CreatePaymentIntentInput = {
  userId: ObjectId;
  amountRwf: number;
  purpose: Extract<PaymentPurpose, "token_fee" | "seeker_view_token" | "seeker_post_fee">;
  listingId?: ObjectId;
  seekerRequestId?: ObjectId;
  metadata?: Record<string, unknown>;
  referencePrefix?: string;
  relatedEntityId?: string;
  returnPath: string;
  pendingReuseKey?: string;
};

export type PaymentIntentResult = {
  payment: WithId<PaymentDocument>;
  checkoutUrl: string;
  reused: boolean;
  checkoutMode: PaymentCheckoutMode;
};

export type PaymentCheckoutMode = "mock" | "afripay";

export type AfripayCheckoutFields = {
  amount: string;
  currency: string;
  comment: string;
  client_token: string;
  return_url: string;
  app_id: string;
  app_secret: string;
};

export type AfripayCheckoutData = {
  actionUrl: string;
  method: "POST";
  fields: AfripayCheckoutFields;
  returnMode: "legacy_form_post";
};

export type PaymentCheckoutData = {
  id: string;
  reference: string;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amountRwf: number;
  checkoutUrl: string | null;
  checkoutExpiresAt: string | null;
  createdAt: string;
  failureReason: string | null;
  linkedEntityLabel: string | null;
  paymentLabel: string | null;
  returnPath: string;
  checkoutMode: PaymentCheckoutMode;
  afripayCheckout: AfripayCheckoutData | null;
};

export type CompleteMockPaymentResult = {
  payment: WithId<PaymentDocument>;
  redirectPath: string;
};

export type PaymentTransitionResult = {
  payment: WithId<PaymentDocument>;
  redirectPath: string;
};

export type TransitionPaymentStatusInput = {
  reference: string;
  status: Extract<PaymentStatus, "paid" | "failed" | "cancelled">;
  source: "mock_checkout" | "afripay_callback" | "afripay_webhook" | "admin_manual_review" | "system";
  actorUserId?: ObjectId;
  providerReference?: string;
  providerTransactionId?: string;
  lastProviderStatus?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  markWebhookSeen?: boolean;
};

export type AdminPaymentSummary = {
  id: string;
  reference: string;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amountRwf: number;
  userName: string;
  userRole: UserDocument["role"] | null;
  createdAt: string;
  settledAt: string | null;
  linkedEntityLabel: string | null;
  metadataSummary: string | null;
};

export type AdminPaymentEventSummary = {
  id: string;
  action: string;
  actorName: string;
  actorRole: UserDocument["role"] | null;
  createdAt: string;
  reference: string | null;
  purpose: PaymentPurpose | null;
  amountRwf: number | null;
  currentStatus: PaymentStatus | null;
  previousStatus: PaymentStatus | null;
  nextStatus: PaymentStatus | null;
  source: string | null;
  lastProviderStatus: string | null;
  failureReason: string | null;
  linkedEntityLabel: string | null;
};

export type AdminPaymentOverviewData = {
  stats: {
    totalPaidRwf: number;
    paidCount: number;
    pendingCount: number;
    failedCount: number;
    cancelledCount: number;
    listingRevenueRwf: number;
    seekerRevenueRwf: number;
  };
  recentPayments: AdminPaymentSummary[];
  recentEvents: AdminPaymentEventSummary[];
};

function summarizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return null;
  }

  const parts = Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 3)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key.replace(/[_-]+/g, " ")}: ${value.join(", ")}`;
      }

      if (typeof value === "object") {
        return `${key.replace(/[_-]+/g, " ")}: ${JSON.stringify(value)}`;
      }

      return `${key.replace(/[_-]+/g, " ")}: ${String(value)}`;
    });

  return parts.length > 0 ? parts.join(" / ") : null;
}

function buildPaymentReference(prefix: string, relatedEntityId?: string) {
  const normalizedPrefix = prefix.trim().toUpperCase();
  const relatedSuffix = relatedEntityId ? relatedEntityId.slice(-6).toUpperCase() : "GEN";
  const randomSuffix = randomBytes(3).toString("hex").toUpperCase();

  return `${normalizedPrefix}-${relatedSuffix}-${Date.now()}-${randomSuffix}`;
}

function buildIdempotencyKey() {
  return randomBytes(12).toString("hex");
}

function getLinkedEntityLabel(payment: WithId<PaymentDocument>) {
  if (payment.listingId) {
    return `Listing ${payment.listingId.toString()}`;
  }

  if (payment.seekerRequestId) {
    return `Seeker request ${payment.seekerRequestId.toString()}`;
  }

  return null;
}

function serializeAdminPayment(
  payment: WithId<PaymentDocument>,
  userMap: Map<string, WithId<UserDocument>>,
): AdminPaymentSummary {
  const user = userMap.get(payment.userId.toString());

  return {
    id: payment._id.toString(),
    reference: payment.reference,
    purpose: payment.purpose,
    status: payment.status,
    amountRwf: payment.amountRwf,
    userName: user?.fullName ?? "Unknown user",
    userRole: user?.role ?? null,
    createdAt: payment.createdAt.toISOString(),
    settledAt: payment.settledAt?.toISOString() ?? null,
    linkedEntityLabel: getLinkedEntityLabel(payment),
    metadataSummary: summarizeMetadata(payment.metadata),
  };
}

function getStringMetadataValue(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getNumberMetadataValue(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getPaymentPurposeValue(value: unknown): PaymentPurpose | null {
  if (typeof value !== "string") {
    return null;
  }

  return paymentPurposes.includes(value as PaymentPurpose) ? (value as PaymentPurpose) : null;
}

function getPaymentStatusValue(value: unknown): PaymentStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return paymentStatuses.includes(value as PaymentStatus) ? (value as PaymentStatus) : null;
}

function getLinkedEntityLabelFromMetadata(metadata: Record<string, unknown> | undefined) {
  const listingId = getStringMetadataValue(metadata, "listingId");

  if (listingId) {
    return `Listing ${listingId}`;
  }

  const seekerRequestId = getStringMetadataValue(metadata, "seekerRequestId");

  if (seekerRequestId) {
    return `Seeker request ${seekerRequestId}`;
  }

  return null;
}

function serializeAdminPaymentEvent(
  log: WithId<AuditLogDocument>,
  actorMap: Map<string, WithId<UserDocument>>,
): AdminPaymentEventSummary {
  const actor = log.actorUserId ? actorMap.get(log.actorUserId.toString()) : null;
  const metadata = log.metadata;

  return {
    id: log._id.toString(),
    action: log.action,
    actorName: actor?.fullName ?? (log.actorUserId ? "Unknown user" : "System"),
    actorRole: actor?.role ?? null,
    createdAt: log.createdAt.toISOString(),
    reference: getStringMetadataValue(metadata, "reference"),
    purpose: getPaymentPurposeValue(metadata?.purpose),
    amountRwf: getNumberMetadataValue(metadata, "amountRwf"),
    currentStatus: getPaymentStatusValue(metadata?.status),
    previousStatus: getPaymentStatusValue(metadata?.previousStatus),
    nextStatus: getPaymentStatusValue(metadata?.nextStatus) ?? getPaymentStatusValue(metadata?.reviewedStatus),
    source: getStringMetadataValue(metadata, "source"),
    lastProviderStatus: getStringMetadataValue(metadata, "lastProviderStatus"),
    failureReason: getStringMetadataValue(metadata, "failureReason"),
    linkedEntityLabel: getLinkedEntityLabelFromMetadata(metadata),
  };
}

function getCheckoutMode() {
  const env = getServerEnv();

  if (env.PAYMENT_PROVIDER_MODE === "afripay") {
    const credentials = assertAfripayServerCredentials();

    if (credentials.mode !== "app_credentials") {
      throw new Error(
        "The legacy AfrIPay form-post contract requires AFRIPAY_APP_ID and AFRIPAY_APP_SECRET. The legacy key-pair env vars do not match that checkout format.",
      );
    }

    return "afripay" as const;
  }

  return "mock" as const;
}

function getHostedCheckoutUrl(reference: string) {
  return `/payments/checkout/${reference}`;
}

function getConfiguredAppUrl() {
  const env = getServerEnv();
  return (env.NEXT_PUBLIC_APP_URL ?? defaultAppUrl).replace(/\/+$/, "");
}

function getStoredCheckoutMode(payment: Pick<PaymentDocument, "metadata">): PaymentCheckoutMode {
  return payment.metadata?.checkoutMode === "afripay" ? "afripay" : "mock";
}

function getAfripayReturnUrl(payment: Pick<PaymentDocument, "reference">) {
  const appUrl = getConfiguredAppUrl();
  return `${appUrl}/api/payments/callback/afripay?reference=${encodeURIComponent(payment.reference)}`;
}

function getAfripayComment(payment: Pick<PaymentDocument, "purpose" | "reference" | "metadata" | "listingId" | "seekerRequestId">) {
  const label = getPaymentLabel(payment) ?? getLinkedEntityLabel(payment as WithId<PaymentDocument>) ?? payment.reference;
  return `${payment.purpose}:${label}`.slice(0, 255);
}

function buildAfripayCheckoutData(payment: Pick<PaymentDocument, "amountRwf" | "currency" | "purpose" | "reference" | "metadata" | "listingId" | "seekerRequestId">): AfripayCheckoutData {
  const credentials = assertAfripayServerCredentials();

  if (credentials.mode !== "app_credentials") {
    throw new Error(
      "The current AfrIPay credentials do not match the legacy form-post contract. Configure AFRIPAY_APP_ID and AFRIPAY_APP_SECRET.",
    );
  }

  return {
    actionUrl: getAfripayGatewayUrl(),
    method: "POST",
    returnMode: "legacy_form_post",
    fields: {
      amount: String(payment.amountRwf),
      currency: payment.currency,
      comment: getAfripayComment(payment),
      client_token: payment.reference,
      return_url: getAfripayReturnUrl(payment),
      app_id: credentials.appId,
      app_secret: credentials.appSecret,
    },
  };
}

type SeekerRequestDraftFromPayment = {
  category: ListingCategory;
  title: string;
  details: string;
  budgetMinRwf: number;
  budgetMaxRwf: number;
  quantityLabel: string;
  preferredContactTime: string;
  approximateAreaLabel: string;
  district?: string;
  sector?: string;
  durationDays: SeekerRequestDurationDays;
  contactName: string;
  contactPhone: string;
  postedFeeRwf: number;
  viewTokenFeeRwf: number;
  expiresAt: Date;
};

function parseRequiredMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = getStringMetadataValue(metadata, key);

  if (!value) {
    throw new Error(`Payment metadata is missing ${key}.`);
  }

  return value;
}

function parseRequiredMetadataNumber(metadata: Record<string, unknown> | undefined, key: string) {
  const value = getNumberMetadataValue(metadata, key);

  if (value === null) {
    throw new Error(`Payment metadata is missing ${key}.`);
  }

  return value;
}

function getSeekerRequestDraftFromPayment(payment: Pick<PaymentDocument, "metadata">): SeekerRequestDraftFromPayment {
  const metadata = payment.metadata;
  const category = parseRequiredMetadataString(metadata, "category");
  const durationDays = parseRequiredMetadataNumber(metadata, "durationDays");
  const expiresAtValue = parseRequiredMetadataString(metadata, "expiresAt");
  const expiresAt = new Date(expiresAtValue);

  if (!listingCategories.includes(category as ListingCategory)) {
    throw new Error("Payment metadata contains an invalid seeker request category.");
  }

  if (!seekerRequestDurations.includes(durationDays as SeekerRequestDurationDays)) {
    throw new Error("Payment metadata contains an invalid seeker request duration.");
  }

  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error("Payment metadata contains an invalid seeker request expiry.");
  }

  return {
    category: category as ListingCategory,
    title: parseRequiredMetadataString(metadata, "title"),
    details: parseRequiredMetadataString(metadata, "details"),
    budgetMinRwf: parseRequiredMetadataNumber(metadata, "budgetMinRwf"),
    budgetMaxRwf: parseRequiredMetadataNumber(metadata, "budgetMaxRwf"),
    quantityLabel: parseRequiredMetadataString(metadata, "quantityLabel"),
    preferredContactTime: parseRequiredMetadataString(metadata, "preferredContactTime"),
    approximateAreaLabel: parseRequiredMetadataString(metadata, "approximateAreaLabel"),
    district: getStringMetadataValue(metadata, "district") ?? undefined,
    sector: getStringMetadataValue(metadata, "sector") ?? undefined,
    durationDays: durationDays as SeekerRequestDurationDays,
    contactName: parseRequiredMetadataString(metadata, "contactName"),
    contactPhone: parseRequiredMetadataString(metadata, "contactPhone"),
    postedFeeRwf: parseRequiredMetadataNumber(metadata, "postedFeeRwf"),
    viewTokenFeeRwf: parseRequiredMetadataNumber(metadata, "viewTokenFeeRwf"),
    expiresAt,
  };
}

function isPaymentExpired(payment: Pick<PaymentDocument, "status" | "checkoutExpiresAt">, now = new Date()) {
  return payment.status === "pending" && Boolean(payment.checkoutExpiresAt) && payment.checkoutExpiresAt!.getTime() <= now.getTime();
}

function getPaymentReturnPath(payment: Pick<PaymentDocument, "returnPath" | "listingId" | "seekerRequestId">) {
  if (payment.returnPath) {
    return payment.returnPath;
  }

  if (payment.listingId) {
    return `/listings/${payment.listingId.toString()}`;
  }

  if (payment.seekerRequestId) {
    return `/seeker-requests/${payment.seekerRequestId.toString()}`;
  }

  return "/dashboard";
}

function buildPaymentRedirectPath(returnPath: string, payment: Pick<PaymentDocument, "reference" | "status">) {
  const url = new URL(returnPath, "https://getownerinfo.local");
  url.searchParams.set("payment", payment.status);
  url.searchParams.set("paymentReference", payment.reference);

  return `${url.pathname}${url.search}${url.hash}`;
}

function getPaymentLabel(payment: Pick<PaymentDocument, "metadata" | "purpose">) {
  const title = typeof payment.metadata?.listingTitle === "string"
    ? payment.metadata.listingTitle
    : typeof payment.metadata?.title === "string"
      ? payment.metadata.title
      : null;

  return title ?? null;
}

function mergeMetadata(
  current: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined,
) {
  if (!current && !next) {
    return undefined;
  }

  return {
    ...(current ?? {}),
    ...(next ?? {}),
  };
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as Partial<T>;
}

async function createPaymentAuditLog(input: {
  action: string;
  payment: Pick<
    PaymentDocument,
    "_id" | "reference" | "purpose" | "amountRwf" | "status" | "listingId" | "seekerRequestId"
  >;
  actorUserId?: ObjectId;
  createdAt?: Date;
  metadata?: Record<string, unknown>;
}) {
  const auditLogs = await getCollection("auditLogs");
  const timestamp = input.createdAt ?? new Date();

  await auditLogs.insertOne({
    actorUserId: input.actorUserId,
    entityType: "payment",
    entityId: input.payment._id?.toString() ?? input.payment.reference,
    action: input.action,
    metadata: omitUndefined({
      reference: input.payment.reference,
      purpose: input.payment.purpose,
      amountRwf: input.payment.amountRwf,
      status: input.payment.status,
      listingId: input.payment.listingId?.toString(),
      seekerRequestId: input.payment.seekerRequestId?.toString(),
      ...input.metadata,
    }),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function getOwnedPaymentByReference(userId: ObjectId, reference: string) {
  const payments = await getCollection("payments");
  const payment = await payments.findOne({
    reference,
    userId,
  });

  if (!payment) {
    throw new Error("The selected payment could not be found for this account.");
  }

  return payment;
}

async function cancelExpiredPaymentIfNeeded(payment: WithId<PaymentDocument>) {
  if (!isPaymentExpired(payment)) {
    return payment;
  }

  const result = await transitionPaymentStatusByReference({
    reference: payment.reference,
    status: "cancelled",
    source: "system",
    failureReason: "Checkout expired before payment confirmation.",
  });

  return result.payment;
}

async function findReusablePendingPayment(input: CreatePaymentIntentInput) {
  const payments = await getCollection("payments");
  const filter: Record<string, unknown> = {
    userId: input.userId,
    purpose: input.purpose,
    status: "pending",
  };

  if (input.pendingReuseKey) {
    filter["metadata.pendingReuseKey"] = input.pendingReuseKey;
  } else if (input.purpose === "seeker_post_fee") {
    return null;
  }

  if (input.listingId) {
    filter.listingId = input.listingId;
  }

  if (input.seekerRequestId) {
    filter.seekerRequestId = input.seekerRequestId;
  }

  const candidates = await payments
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  for (const candidate of candidates) {
    const nextCandidate = await cancelExpiredPaymentIfNeeded(candidate);

    if (nextCandidate.status === "pending" && nextCandidate.checkoutUrl) {
      return nextCandidate;
    }
  }

  return null;
}

async function applyListingUnlockEffect(payment: WithId<PaymentDocument>) {
  if (!payment.listingId) {
    return;
  }

  const listings = await getCollection("listings");
  const tokenUnlocks = await getCollection("tokenUnlocks");
  const auditLogs = await getCollection("auditLogs");
  const listing = await listings.findOne({
    _id: payment.listingId,
    verificationStatus: "approved",
  });

  if (!listing) {
    throw new Error("The linked listing could not be found while applying the payment result.");
  }

  const existingUnlock = await tokenUnlocks.findOne({
    userId: payment.userId,
    listingId: payment.listingId,
  });

  if (!existingUnlock) {
    const unlockTimestamp = payment.settledAt ?? new Date();
    await tokenUnlocks.insertOne({
      userId: payment.userId,
      listingId: payment.listingId,
      unlockedAt: unlockTimestamp,
      fieldsUnlocked: ["ownerName", "ownerPhone", "address", "keysManager"],
      createdAt: unlockTimestamp,
      updatedAt: unlockTimestamp,
    } satisfies Omit<TokenUnlockDocument, "_id">);

    await auditLogs.insertOne({
      actorUserId: payment.userId,
      entityType: "token_unlock",
      entityId: payment.listingId.toString(),
      action: "listing_unlock_paid",
      metadata: {
        paymentReference: payment.reference,
        listingTitle: listing.title,
        amountRwf: payment.amountRwf,
      },
      createdAt: unlockTimestamp,
      updatedAt: unlockTimestamp,
    });
  }

  await createNotification({
    userId: listing.ownerUserId,
    kind: "listing_unlocked",
    severity: "success",
    title: "A buyer completed the listing unlock",
    body: `${String(payment.metadata?.actorName ?? "A buyer")} completed the unlock for ${listing.title}.`,
    entityType: "token_unlock",
    entityId: payment.listingId.toString(),
    link: "/dashboard#notifications",
  });
}

async function applySeekerRequestUnlockEffect(payment: WithId<PaymentDocument>) {
  if (!payment.seekerRequestId) {
    return;
  }

  const seekerRequests = await getCollection("seekerRequests");
  const seekerRequestUnlocks = await getCollection("seekerRequestUnlocks");
  const auditLogs = await getCollection("auditLogs");
  const seekerRequest = await seekerRequests.findOne({
    _id: payment.seekerRequestId,
  });

  if (!seekerRequest) {
    throw new Error("The linked seeker request could not be found while applying the payment result.");
  }

  const existingUnlock = await seekerRequestUnlocks.findOne({
    userId: payment.userId,
    seekerRequestId: payment.seekerRequestId,
  });

  if (!existingUnlock) {
    const unlockTimestamp = payment.settledAt ?? new Date();
    await seekerRequestUnlocks.insertOne({
      userId: payment.userId,
      requesterUserId: seekerRequest.requesterUserId,
      seekerRequestId: payment.seekerRequestId,
      unlockedAt: unlockTimestamp,
      fieldsUnlocked: ["seekerName", "seekerPhone", "preferredContactTime", "fullDetails"],
      createdAt: unlockTimestamp,
      updatedAt: unlockTimestamp,
    } satisfies Omit<SeekerRequestUnlockDocument, "_id">);

    await auditLogs.insertOne({
      actorUserId: payment.userId,
      entityType: "seeker_request",
      entityId: payment.seekerRequestId.toString(),
      action: "seeker_request_unlock_paid",
      metadata: {
        paymentReference: payment.reference,
        title: seekerRequest.title,
        amountRwf: payment.amountRwf,
      },
      createdAt: unlockTimestamp,
      updatedAt: unlockTimestamp,
    });
  }

  await createNotification({
    userId: seekerRequest.requesterUserId,
    kind: "seeker_request_unlocked",
    severity: "success",
    title: "An owner completed the seeker unlock",
    body: `${String(payment.metadata?.actorName ?? "An owner")} completed the unlock for ${seekerRequest.title}.`,
    entityType: "seeker_request",
    entityId: payment.seekerRequestId.toString(),
    link: "/dashboard#notifications",
  });
}

async function applySeekerRequestPostEffect(payment: WithId<PaymentDocument>) {
  const payments = await getCollection("payments");
  const seekerRequests = await getCollection("seekerRequests");
  const auditLogs = await getCollection("auditLogs");
  const publishTimestamp = payment.settledAt ?? new Date();
  const draft = getSeekerRequestDraftFromPayment(payment);
  const requestId = payment.seekerRequestId ?? payment._id;
  let seekerRequest = await seekerRequests.findOne({
    _id: requestId,
  });

  if (!seekerRequest && payment.seekerRequestId) {
    throw new Error("The linked seeker request could not be found while applying the payment result.");
  }

  if (!seekerRequest) {
    const requestDocument: WithId<SeekerRequestDocument> = {
      _id: requestId,
      requesterUserId: payment.userId,
      category: draft.category,
      title: draft.title,
      details: draft.details,
      budgetMinRwf: draft.budgetMinRwf,
      budgetMaxRwf: draft.budgetMaxRwf,
      quantityLabel: draft.quantityLabel,
      preferredContactTime: draft.preferredContactTime,
      status: "active",
      durationDays: draft.durationDays,
      approximateAreaLabel: draft.approximateAreaLabel,
      district: draft.district,
      sector: draft.sector,
      contactName: draft.contactName,
      contactPhone: draft.contactPhone,
      postedFeeRwf: draft.postedFeeRwf,
      viewTokenFeeRwf: draft.viewTokenFeeRwf,
      expiresAt: draft.expiresAt,
      createdAt: publishTimestamp,
      updatedAt: publishTimestamp,
    };

    await seekerRequests.insertOne(requestDocument);
    seekerRequest = requestDocument;

    await auditLogs.insertOne({
      actorUserId: payment.userId,
      entityType: "seeker_request",
      entityId: requestId.toString(),
      action: "seeker_request_created",
      metadata: {
        category: requestDocument.category,
        durationDays: requestDocument.durationDays,
        postedFeeRwf: requestDocument.postedFeeRwf,
        paymentReference: payment.reference,
      },
      createdAt: publishTimestamp,
      updatedAt: publishTimestamp,
    });

    await createNotification({
      userId: payment.userId,
      kind: "seeker_request_created",
      severity: "success",
      title: "Seeker request posted",
      body: `${requestDocument.title} is now live on the demand board.`,
      entityType: "seeker_request",
      entityId: requestId.toString(),
      link: "/dashboard#notifications",
    });

    await notifyUsersByRoles(adminRoles, {
      kind: "seeker_request_created",
      severity: "info",
      title: "New seeker request posted",
      body: `${requestDocument.title} is now visible on the demand board.`,
      entityType: "seeker_request",
      entityId: requestId.toString(),
      link: "/admin#notifications",
    });
  }

  if (!seekerRequest) {
    throw new Error("Could not publish the seeker request after payment settlement.");
  }

  const nextReturnPath = `/seeker-requests/${requestId.toString()}`;
  const nextMetadata = mergeMetadata(payment.metadata, {
    seekerRequestId: requestId.toString(),
    title: seekerRequest.title,
    returnPath: nextReturnPath,
    paymentEffect: "seeker_request_posted",
  });

  await payments.updateOne(
    {
      _id: payment._id,
    },
    {
      $set: {
        seekerRequestId: requestId,
        returnPath: nextReturnPath,
        metadata: nextMetadata,
        updatedAt: new Date(),
      },
    },
  );

  await createPaymentAuditLog({
    actorUserId: payment.userId,
    action: "payment_paid_effect_applied",
    payment: {
      _id: payment._id,
      reference: payment.reference,
      purpose: payment.purpose,
      amountRwf: payment.amountRwf,
      status: payment.status,
      listingId: payment.listingId,
      seekerRequestId: requestId,
    },
    metadata: {
      effect: "seeker_request_posted",
      seekerRequestId: requestId.toString(),
      returnPath: nextReturnPath,
    },
  });
}

async function applyPaidPaymentEffects(payment: WithId<PaymentDocument>) {
  switch (payment.purpose) {
    case "token_fee":
      await applyListingUnlockEffect(payment);
      return;
    case "seeker_view_token":
      await applySeekerRequestUnlockEffect(payment);
      return;
    case "seeker_post_fee":
      await applySeekerRequestPostEffect(payment);
      return;
    default:
      return;
  }
}

export async function createPaymentRecord(input: CreatePaymentRecordInput) {
  const payments = await getCollection("payments");
  const now = new Date();
  const status = input.status ?? "paid";
  const reference = buildPaymentReference(
    input.referencePrefix ?? input.purpose,
    input.relatedEntityId ?? input.listingId?.toString() ?? input.seekerRequestId?.toString(),
  );
  const document: Omit<PaymentDocument, "_id"> = {
    userId: input.userId,
    listingId: input.listingId,
    seekerRequestId: input.seekerRequestId,
    amountRwf: input.amountRwf,
    currency: "RWF",
    provider: "afripay",
    purpose: input.purpose,
    status,
    reference,
    providerReference: input.providerReference,
    providerTransactionId: input.providerTransactionId,
    idempotencyKey: buildIdempotencyKey(),
    returnPath: input.returnPath,
    settledAt: status === "paid" ? now : undefined,
    failedAt: status === "failed" ? now : undefined,
    cancelledAt: status === "cancelled" ? now : undefined,
    paidActionAppliedAt: status === "paid" ? now : undefined,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };
  const result = await payments.insertOne(document);

  const payment = {
    ...document,
    _id: result.insertedId,
  };

  await createPaymentAuditLog({
    actorUserId: input.auditActorUserId ?? input.userId,
    action: "payment_record_created",
      payment,
      createdAt: now,
      metadata: {
        returnPath: input.returnPath,
        providerReference: input.providerReference,
      providerTransactionId: input.providerTransactionId,
    },
  });

  return payment;
}

export async function createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
  if (input.amountRwf <= 0) {
    throw new Error("Only positive payment amounts can create a checkout intent.");
  }

  const payments = await getCollection("payments");
  const checkoutMode = getCheckoutMode();
  const reusablePayment = await findReusablePendingPayment(input);

  if (reusablePayment) {
    return {
      payment: reusablePayment,
      checkoutUrl: reusablePayment.checkoutUrl ?? getHostedCheckoutUrl(reusablePayment.reference),
      reused: true,
      checkoutMode,
    };
  }

  const now = new Date();
  const reference = buildPaymentReference(
    input.referencePrefix ?? input.purpose,
    input.relatedEntityId ?? input.listingId?.toString() ?? input.seekerRequestId?.toString(),
  );
  const checkoutUrl = getHostedCheckoutUrl(reference);
  const checkoutExpiresAt = new Date(now.getTime() + checkoutLifetimeMs);
  const document: Omit<PaymentDocument, "_id"> = {
    userId: input.userId,
    listingId: input.listingId,
    seekerRequestId: input.seekerRequestId,
    amountRwf: input.amountRwf,
    currency: "RWF",
    provider: "afripay",
    purpose: input.purpose,
    status: "pending",
    reference,
    checkoutUrl,
    checkoutExpiresAt,
    returnPath: input.returnPath,
    idempotencyKey: buildIdempotencyKey(),
    metadata: mergeMetadata(input.metadata, {
      checkoutMode,
      pendingReuseKey: input.pendingReuseKey,
    }),
    createdAt: now,
    updatedAt: now,
  };
  const result = await payments.insertOne(document);
  const payment = {
    ...document,
    _id: result.insertedId,
  };

  await createPaymentAuditLog({
    actorUserId: input.userId,
    action: "payment_intent_created",
    payment,
    createdAt: now,
    metadata: {
      checkoutMode,
      checkoutExpiresAt: checkoutExpiresAt.toISOString(),
      returnPath: input.returnPath,
    },
  });

  return {
    payment,
    checkoutUrl,
    reused: false,
    checkoutMode,
  };
}

export async function getPaymentCheckoutDataForSession(
  session: AuthSession,
  reference: string,
): Promise<PaymentCheckoutData> {
  const user = await ensureUserRecord(session);
  const payment = await cancelExpiredPaymentIfNeeded(await getOwnedPaymentByReference(user._id, reference));
  const checkoutMode = getStoredCheckoutMode(payment);

  return {
    id: payment._id.toString(),
    reference: payment.reference,
    purpose: payment.purpose,
    status: payment.status,
    amountRwf: payment.amountRwf,
    checkoutUrl: payment.checkoutUrl ?? null,
    checkoutExpiresAt: payment.checkoutExpiresAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    failureReason: payment.failureReason ?? null,
    linkedEntityLabel: getLinkedEntityLabel(payment),
    paymentLabel: getPaymentLabel(payment),
    returnPath: getPaymentReturnPath(payment),
    checkoutMode,
    afripayCheckout: checkoutMode === "afripay" ? buildAfripayCheckoutData(payment) : null,
  };
}

export async function recordPaymentGatewaySignalByReference(input: {
  reference: string;
  action: string;
  source: "afripay_callback" | "afripay_webhook";
  providerReference?: string;
  providerTransactionId?: string;
  lastProviderStatus?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  markWebhookSeen?: boolean;
}): Promise<PaymentTransitionResult> {
  const payments = await getCollection("payments");
  const now = new Date();
  const existingPayment = await payments.findOne({
    reference: input.reference,
  });

  if (!existingPayment) {
    throw new Error("The selected payment reference could not be found.");
  }

  const updatedPayment = await payments.findOneAndUpdate(
    {
      _id: existingPayment._id,
    },
    {
      $set: omitUndefined({
        updatedAt: now,
        metadata: mergeMetadata(existingPayment.metadata, input.metadata),
        providerReference: input.providerReference ?? existingPayment.providerReference,
        providerTransactionId: input.providerTransactionId ?? existingPayment.providerTransactionId,
        lastProviderStatus: input.lastProviderStatus ?? existingPayment.lastProviderStatus,
        failureReason: input.failureReason ?? existingPayment.failureReason,
        lastWebhookAt: input.markWebhookSeen ? now : existingPayment.lastWebhookAt,
      }),
    },
    {
      returnDocument: "after",
    },
  );

  if (!updatedPayment) {
    throw new Error("Could not record the AfrIPay gateway signal.");
  }

  await createPaymentAuditLog({
    action: input.action,
    payment: updatedPayment,
    createdAt: now,
    metadata: {
      source: input.source,
      providerReference: input.providerReference,
      providerTransactionId: input.providerTransactionId,
      lastProviderStatus: input.lastProviderStatus,
      failureReason: input.failureReason,
      markWebhookSeen: input.markWebhookSeen,
      ...input.metadata,
    },
  });

  return {
    payment: updatedPayment,
    redirectPath: buildPaymentRedirectPath(getPaymentReturnPath(updatedPayment), updatedPayment),
  };
}

export async function transitionPaymentStatusByReference(
  input: TransitionPaymentStatusInput,
): Promise<PaymentTransitionResult> {
  const payments = await getCollection("payments");
  const now = new Date();
  const existingPayment = await payments.findOne({
    reference: input.reference,
  });

  if (!existingPayment) {
    throw new Error("The selected payment reference could not be found.");
  }

  if (existingPayment.status === "paid") {
    if (!existingPayment.paidActionAppliedAt) {
      await applyPaidPaymentEffects(existingPayment);
      await payments.updateOne(
        {
          _id: existingPayment._id,
          paidActionAppliedAt: { $exists: false },
        },
        {
          $set: {
            paidActionAppliedAt: now,
            updatedAt: now,
          },
        },
      );
    }

    const settledPayment = (await payments.findOne({ _id: existingPayment._id })) ?? existingPayment;

    return {
      payment: settledPayment,
      redirectPath: buildPaymentRedirectPath(getPaymentReturnPath(settledPayment), settledPayment),
    };
  }

  const mergedMetadata = mergeMetadata(existingPayment.metadata, input.metadata);
  const setUpdates: Partial<PaymentDocument> = {
    status: input.status,
    updatedAt: now,
    metadata: mergedMetadata,
    providerReference: input.providerReference ?? existingPayment.providerReference,
    providerTransactionId: input.providerTransactionId ?? existingPayment.providerTransactionId,
    lastProviderStatus: input.lastProviderStatus ?? input.status,
    failureReason:
      input.status === "failed" || input.status === "cancelled"
        ? input.failureReason ?? existingPayment.failureReason
        : undefined,
    lastWebhookAt: input.markWebhookSeen ? now : existingPayment.lastWebhookAt,
  };
  const unsetUpdates: Record<string, "" | 1> = {};

  if (input.status === "paid") {
    setUpdates.settledAt = existingPayment.settledAt ?? now;
    unsetUpdates.failedAt = "";
    unsetUpdates.cancelledAt = "";
    unsetUpdates.failureReason = "";
  }

  if (input.status === "failed") {
    setUpdates.failedAt = existingPayment.failedAt ?? now;
    unsetUpdates.cancelledAt = "";
  }

  if (input.status === "cancelled") {
    setUpdates.cancelledAt = existingPayment.cancelledAt ?? now;
    unsetUpdates.failedAt = "";
  }

  const normalizedSetUpdates = omitUndefined(setUpdates as Record<string, unknown>);
  const updatedPayment = await payments.findOneAndUpdate(
    {
      _id: existingPayment._id,
    },
    {
      $set: normalizedSetUpdates,
      ...(Object.keys(unsetUpdates).length > 0 ? { $unset: unsetUpdates } : {}),
    },
    {
      returnDocument: "after",
    },
  );

  if (!updatedPayment) {
    throw new Error("Could not update the payment status.");
  }

  if (existingPayment.status !== updatedPayment.status) {
    await createPaymentAuditLog({
      actorUserId: input.actorUserId,
      action: "payment_status_updated",
      payment: updatedPayment,
      createdAt: now,
      metadata: {
        previousStatus: existingPayment.status,
        nextStatus: updatedPayment.status,
        source: input.source,
        providerReference: input.providerReference,
        providerTransactionId: input.providerTransactionId,
        lastProviderStatus: input.lastProviderStatus,
        failureReason: input.failureReason,
        markWebhookSeen: input.markWebhookSeen,
      },
    });
  }

  if (updatedPayment.status === "paid" && !updatedPayment.paidActionAppliedAt) {
    await applyPaidPaymentEffects(updatedPayment);
    const finalizedPayment = await payments.findOneAndUpdate(
      {
        _id: updatedPayment._id,
      },
      {
        $set: {
          paidActionAppliedAt: now,
          updatedAt: now,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!finalizedPayment) {
      throw new Error("Could not finalize the paid payment.");
    }

    return {
      payment: finalizedPayment,
      redirectPath: buildPaymentRedirectPath(getPaymentReturnPath(finalizedPayment), finalizedPayment),
    };
  }

  return {
    payment: updatedPayment,
    redirectPath: buildPaymentRedirectPath(getPaymentReturnPath(updatedPayment), updatedPayment),
  };
}

export async function completeMockPaymentForSession(
  session: AuthSession,
  reference: string,
  outcome: "paid" | "failed" | "cancelled",
): Promise<CompleteMockPaymentResult> {
  const user = await ensureUserRecord(session);
  const payment = await cancelExpiredPaymentIfNeeded(await getOwnedPaymentByReference(user._id, reference));

  if (payment.status !== "pending") {
    return {
      payment,
      redirectPath: buildPaymentRedirectPath(getPaymentReturnPath(payment), payment),
    };
  }

  return transitionPaymentStatusByReference({
    reference,
    status: outcome,
    source: "mock_checkout",
    actorUserId: user._id,
    providerReference: `mock:${reference}`,
    providerTransactionId: `mock-txn-${Date.now()}`,
    lastProviderStatus: outcome,
    failureReason:
      outcome === "failed"
        ? "The mock gateway marked this payment as failed."
        : outcome === "cancelled"
          ? "The mock gateway cancelled this payment."
          : undefined,
    metadata: {
      completedVia: "mock_checkout",
    },
  });
}

export async function applyAdminManualPaymentStatus(
  session: AuthSession,
  reference: string,
  status: Extract<PaymentStatus, "paid" | "failed" | "cancelled">,
  reviewNote?: string,
) {
  const reviewer = await ensureUserRecord(session);
  const payments = await getCollection("payments");
  const existingPayment = await payments.findOne({
    reference,
  });

  if (!existingPayment) {
    throw new Error("The selected payment reference could not be found.");
  }

  if (existingPayment.status === "paid" && status !== "paid") {
    throw new Error("Paid payments cannot be manually reversed.");
  }

  const result = await transitionPaymentStatusByReference({
    reference,
    status,
    source: "admin_manual_review",
    actorUserId: reviewer._id,
    lastProviderStatus: existingPayment.lastProviderStatus,
    failureReason:
      status === "failed"
        ? reviewNote ?? existingPayment.failureReason ?? "Marked as failed during manual review."
        : status === "cancelled"
          ? reviewNote ?? existingPayment.failureReason ?? "Cancelled during manual review."
          : undefined,
    metadata: reviewNote
      ? {
          reviewNote,
          reviewedByName: reviewer.fullName,
          reviewedByRole: reviewer.role,
        }
      : {
          reviewedByName: reviewer.fullName,
          reviewedByRole: reviewer.role,
        },
  });

  await createPaymentAuditLog({
    actorUserId: reviewer._id,
    action: "payment_manual_reviewed",
    payment: result.payment,
    metadata: {
      previousStatus: existingPayment.status,
      reviewedStatus: status,
      reviewNote,
    },
  });

  if (existingPayment.status !== result.payment.status || reviewNote) {
    const label = getPaymentLabel(result.payment) ?? result.payment.reference;
    const nextLink = getPaymentReturnPath(result.payment);
    const statusMessage =
      status === "paid"
        ? `${label} was manually confirmed as paid by the admin team.`
        : status === "failed"
          ? `${label} was manually marked as failed during payment review.`
          : `${label} was manually cancelled during payment review.`;

    await createNotification({
      userId: result.payment.userId,
      kind: "payment_status_changed",
      severity: status === "paid" ? "success" : "warning",
      title: status === "paid" ? "Payment confirmed manually" : "Payment updated during review",
      body: reviewNote ? `${statusMessage} Note: ${reviewNote}` : statusMessage,
      entityType: "payment",
      entityId: result.payment._id.toString(),
      link: nextLink,
    });
  }

  return {
    payment: result.payment,
    previousStatus: existingPayment.status,
  };
}

export async function getAdminPaymentOverviewData(): Promise<AdminPaymentOverviewData> {
  const payments = await getCollection("payments");
  const auditLogs = await getCollection("auditLogs");
  const users = await getCollection("users");
  const [recentPayments, recentPaymentEvents, totals, listingRevenue, seekerRevenue, pendingCount, failedCount, cancelledCount] =
    await Promise.all([
    payments
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
    auditLogs
      .find({
        entityType: "payment",
        action: { $in: ["payment_record_created", "payment_intent_created", "payment_status_updated", "payment_manual_reviewed", "payment_paid_effect_applied"] },
      })
      .sort({ createdAt: -1 })
      .limit(12)
      .toArray(),
    payments
      .aggregate<{ _id: null; totalPaidRwf: number; paidCount: number }>([
        {
          $match: {
            status: "paid",
          },
        },
        {
          $group: {
            _id: null,
            totalPaidRwf: { $sum: "$amountRwf" },
            paidCount: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    payments
      .aggregate<{ _id: null; amountRwf: number }>([
        {
          $match: {
            status: "paid",
            purpose: { $in: ["listing_fee", "token_fee", "commission", "penalty"] },
          },
        },
        {
          $group: {
            _id: null,
            amountRwf: { $sum: "$amountRwf" },
          },
        },
      ])
      .toArray(),
    payments
      .aggregate<{ _id: null; amountRwf: number }>([
        {
          $match: {
            status: "paid",
            purpose: { $in: ["seeker_post_fee", "seeker_view_token"] },
          },
        },
        {
          $group: {
            _id: null,
            amountRwf: { $sum: "$amountRwf" },
          },
        },
      ])
      .toArray(),
    payments.countDocuments({ status: "pending" }),
    payments.countDocuments({ status: "failed" }),
    payments.countDocuments({ status: "cancelled" }),
    ]);
  const userIds = [
    ...new Set([
      ...recentPayments.map((payment) => payment.userId.toString()),
      ...recentPaymentEvents.flatMap((log) => (log.actorUserId ? [log.actorUserId.toString()] : [])),
    ]),
  ].map((id) => new ObjectId(id));
  const paymentUsers =
    userIds.length > 0
      ? await users
          .find({
            _id: { $in: userIds },
          })
          .toArray()
      : [];
  const userMap = new Map(paymentUsers.map((user) => [user._id.toString(), user]));

  return {
    stats: {
      totalPaidRwf: totals[0]?.totalPaidRwf ?? 0,
      paidCount: totals[0]?.paidCount ?? 0,
      pendingCount,
      failedCount,
      cancelledCount,
      listingRevenueRwf: listingRevenue[0]?.amountRwf ?? 0,
      seekerRevenueRwf: seekerRevenue[0]?.amountRwf ?? 0,
    },
    recentPayments: recentPayments.map((payment) => serializeAdminPayment(payment, userMap)),
    recentEvents: recentPaymentEvents.map((log) => serializeAdminPaymentEvent(log, userMap)),
  };
}
