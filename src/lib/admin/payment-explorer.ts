import { ObjectId, type Filter, type WithId } from "mongodb";

import { getCollection } from "@/lib/data/collections";
import { paymentPurposes, paymentStatuses } from "@/lib/domain";
import type {
  AuditLogDocument,
  PaymentDocument,
  PaymentPurpose,
  PaymentStatus,
  UserDocument,
  UserRole,
} from "@/lib/domain";

type SearchParamValue = string | string[] | undefined;

export type AdminPaymentStatusFilter = PaymentStatus | "all";
export type AdminPaymentPurposeFilter = PaymentPurpose | "all";

export type AdminPaymentExplorerFilters = {
  status: AdminPaymentStatusFilter;
  purpose: AdminPaymentPurposeFilter;
  query: string;
  limit: number;
};

export type AdminPaymentExplorerPayment = {
  id: string;
  reference: string;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amountRwf: number;
  userName: string;
  userRole: UserRole | null;
  createdAt: string;
  settledAt: string | null;
  linkedEntityLabel: string | null;
  metadataSummary: string | null;
  providerReference: string | null;
  providerTransactionId: string | null;
  lastProviderStatus: string | null;
  failureReason: string | null;
};

export type AdminPaymentExplorerEvent = {
  id: string;
  action: string;
  actorName: string;
  actorRole: UserRole | null;
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

export type AdminPaymentExplorerData = {
  filters: AdminPaymentExplorerFilters;
  totalCount: number;
  stats: {
    totalPaidRwf: number;
    paidCount: number;
    pendingCount: number;
    failedCount: number;
    cancelledCount: number;
    listingRevenueRwf: number;
    seekerRevenueRwf: number;
  };
  payments: AdminPaymentExplorerPayment[];
  events: AdminPaymentExplorerEvent[];
  availableStatuses: PaymentStatus[];
  availablePurposes: PaymentPurpose[];
};

const availableStatuses: PaymentStatus[] = [...paymentStatuses];
const availablePurposes: PaymentPurpose[] = [...paymentPurposes];
const defaultLimit = 24;
const maxLimit = 200;
const maxEventCount = 16;

function getSingleSearchParam(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeTrimmedSearchParam(value: SearchParamValue) {
  return getSingleSearchParam(value).trim();
}

function parseLimit(value: SearchParamValue) {
  const parsed = Number(getSingleSearchParam(value));

  if (!Number.isFinite(parsed)) {
    return defaultLimit;
  }

  return Math.min(maxLimit, Math.max(10, Math.round(parsed)));
}

function parseStatus(value: SearchParamValue): AdminPaymentStatusFilter {
  const normalized = normalizeTrimmedSearchParam(value);
  return availableStatuses.includes(normalized as PaymentStatus) ? (normalized as PaymentStatus) : "all";
}

function parsePurpose(value: SearchParamValue): AdminPaymentPurposeFilter {
  const normalized = normalizeTrimmedSearchParam(value);
  return availablePurposes.includes(normalized as PaymentPurpose) ? (normalized as PaymentPurpose) : "all";
}

export function parseAdminPaymentExplorerFilters(
  searchParams: Record<string, SearchParamValue>,
): AdminPaymentExplorerFilters {
  return {
    status: parseStatus(searchParams.paymentStatus),
    purpose: parsePurpose(searchParams.paymentPurpose),
    query: normalizeTrimmedSearchParam(searchParams.paymentQuery),
    limit: parseLimit(searchParams.paymentLimit),
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function summarizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return null;
  }

  const parts = Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${key.replace(/[_-]+/g, " ")}: ${serializeMetadataValue(value)}`);

  return parts.length > 0 ? parts.join(" / ") : null;
}

function getLinkedEntityLabel(payment: Pick<PaymentDocument, "listingId" | "seekerRequestId">) {
  if (payment.listingId) {
    return `Listing ${payment.listingId.toString()}`;
  }

  if (payment.seekerRequestId) {
    return `Seeker request ${payment.seekerRequestId.toString()}`;
  }

  return null;
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

  return availablePurposes.includes(value as PaymentPurpose) ? (value as PaymentPurpose) : null;
}

function getPaymentStatusValue(value: unknown): PaymentStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return availableStatuses.includes(value as PaymentStatus) ? (value as PaymentStatus) : null;
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

function serializePaymentEntry(
  payment: WithId<PaymentDocument>,
  userMap: Map<string, WithId<UserDocument>>,
): AdminPaymentExplorerPayment {
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
    providerReference: payment.providerReference ?? null,
    providerTransactionId: payment.providerTransactionId ?? null,
    lastProviderStatus: payment.lastProviderStatus ?? null,
    failureReason: payment.failureReason ?? null,
  };
}

function serializePaymentEvent(
  log: WithId<AuditLogDocument>,
  actorMap: Map<string, WithId<UserDocument>>,
): AdminPaymentExplorerEvent {
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

async function buildPaymentTextFilter(query: string): Promise<Filter<PaymentDocument> | null> {
  if (!query) {
    return null;
  }

  const regex = new RegExp(escapeRegex(query), "i");
  const users = await getCollection("users");
  const matchingUsers = await users
    .find(
      {
        $or: [{ fullName: regex }, { phone: regex }, { email: regex }],
      },
      {
        projection: { _id: 1 },
      },
    )
    .limit(20)
    .toArray();

  return {
    $or: [
      { reference: regex },
      { providerReference: regex },
      { providerTransactionId: regex },
      { lastProviderStatus: regex },
      { failureReason: regex },
      { "metadata.title": regex },
      { "metadata.listingTitle": regex },
      { "metadata.reference": regex },
      { "metadata.reason": regex },
      { "metadata.reviewNote": regex },
      ...(matchingUsers.length > 0
        ? [
            {
              userId: {
                $in: matchingUsers.map((user) => user._id),
              },
            },
          ]
        : []),
    ],
  };
}

function buildPaymentEventFilter(filters: AdminPaymentExplorerFilters): Filter<AuditLogDocument> {
  const clauses: Filter<AuditLogDocument>[] = [{ entityType: "payment" }];

  if (filters.purpose !== "all") {
    clauses.push({ "metadata.purpose": filters.purpose });
  }

  if (filters.status !== "all") {
    clauses.push({
      $or: [
        { "metadata.status": filters.status },
        { "metadata.previousStatus": filters.status },
        { "metadata.nextStatus": filters.status },
        { "metadata.reviewedStatus": filters.status },
      ],
    });
  }

  if (filters.query) {
    const regex = new RegExp(escapeRegex(filters.query), "i");

    clauses.push({
      $or: [
        { entityId: regex },
        { action: regex },
        { "metadata.reference": regex },
        { "metadata.providerReference": regex },
        { "metadata.providerTransactionId": regex },
        { "metadata.title": regex },
        { "metadata.listingTitle": regex },
        { "metadata.reviewNote": regex },
        { "metadata.reviewedByName": regex },
        { "metadata.failureReason": regex },
      ],
    });
  }

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

async function buildPaymentMongoFilter(filters: AdminPaymentExplorerFilters): Promise<Filter<PaymentDocument>> {
  const clauses: Filter<PaymentDocument>[] = [];

  if (filters.status !== "all") {
    clauses.push({ status: filters.status });
  }

  if (filters.purpose !== "all") {
    clauses.push({ purpose: filters.purpose });
  }

  const textFilter = await buildPaymentTextFilter(filters.query);

  if (textFilter) {
    clauses.push(textFilter);
  }

  return clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };
}

export async function getAdminPaymentExplorerData(
  filters: AdminPaymentExplorerFilters,
): Promise<AdminPaymentExplorerData> {
  const payments = await getCollection("payments");
  const auditLogs = await getCollection("auditLogs");
  const users = await getCollection("users");
  const paymentFilter = await buildPaymentMongoFilter(filters);
  const paymentEventFilter = buildPaymentEventFilter(filters);
  const statsPipeline = [
    ...(Object.keys(paymentFilter).length > 0 ? [{ $match: paymentFilter }] : []),
    {
      $group: {
        _id: null,
        totalPaidRwf: {
          $sum: {
            $cond: [{ $eq: ["$status", "paid"] }, "$amountRwf", 0],
          },
        },
        paidCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "paid"] }, 1, 0],
          },
        },
        pendingCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
          },
        },
        failedCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
          },
        },
        cancelledCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
          },
        },
        listingRevenueRwf: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "paid"] },
                  { $in: ["$purpose", ["listing_fee", "token_fee", "commission", "penalty"]] },
                ],
              },
              "$amountRwf",
              0,
            ],
          },
        },
        seekerRevenueRwf: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "paid"] },
                  { $in: ["$purpose", ["seeker_post_fee", "seeker_view_token"]] },
                ],
              },
              "$amountRwf",
              0,
            ],
          },
        },
      },
    },
  ];
  const [paymentEntries, totalCount, eventEntries, statsResults] = await Promise.all([
    payments.find(paymentFilter).sort({ createdAt: -1 }).limit(filters.limit).toArray(),
    payments.countDocuments(paymentFilter),
    auditLogs.find(paymentEventFilter).sort({ createdAt: -1 }).limit(Math.min(filters.limit, maxEventCount)).toArray(),
    payments.aggregate<{
      _id: null;
      totalPaidRwf: number;
      paidCount: number;
      pendingCount: number;
      failedCount: number;
      cancelledCount: number;
      listingRevenueRwf: number;
      seekerRevenueRwf: number;
    }>(statsPipeline).toArray(),
  ]);

  const userIds = [
    ...new Set([
      ...paymentEntries.map((payment) => payment.userId.toString()),
      ...eventEntries.flatMap((log) => (log.actorUserId ? [log.actorUserId.toString()] : [])),
    ]),
  ].map((id) => new ObjectId(id));
  const userDocuments =
    userIds.length > 0
      ? await users
          .find({
            _id: { $in: userIds },
          })
          .toArray()
      : [];
  const userMap = new Map(userDocuments.map((user) => [user._id.toString(), user]));
  const stats = statsResults[0] ?? {
    totalPaidRwf: 0,
    paidCount: 0,
    pendingCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    listingRevenueRwf: 0,
    seekerRevenueRwf: 0,
  };

  return {
    filters,
    totalCount,
    stats: {
      totalPaidRwf: stats.totalPaidRwf,
      paidCount: stats.paidCount,
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
      cancelledCount: stats.cancelledCount,
      listingRevenueRwf: stats.listingRevenueRwf,
      seekerRevenueRwf: stats.seekerRevenueRwf,
    },
    payments: paymentEntries.map((payment) => serializePaymentEntry(payment, userMap)),
    events: eventEntries.map((log) => serializePaymentEvent(log, userMap)),
    availableStatuses,
    availablePurposes,
  };
}

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function buildAdminPaymentExportCsv(filters: AdminPaymentExplorerFilters) {
  const exportFilters = {
    ...filters,
    limit: Math.min(filters.limit, maxLimit),
  };
  const data = await getAdminPaymentExplorerData(exportFilters);
  const header = [
    "createdAt",
    "settledAt",
    "reference",
    "status",
    "purpose",
    "amountRwf",
    "userName",
    "userRole",
    "linkedEntityLabel",
    "providerReference",
    "providerTransactionId",
    "lastProviderStatus",
    "failureReason",
    "metadataSummary",
  ];
  const rows = data.payments.map((payment) => [
    payment.createdAt,
    payment.settledAt ?? "",
    payment.reference,
    payment.status,
    payment.purpose,
    String(payment.amountRwf),
    payment.userName,
    payment.userRole ?? "",
    payment.linkedEntityLabel ?? "",
    payment.providerReference ?? "",
    payment.providerTransactionId ?? "",
    payment.lastProviderStatus ?? "",
    payment.failureReason ?? "",
    payment.metadataSummary ?? "",
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}
