import { randomBytes } from "node:crypto";

import { ObjectId, type WithId } from "mongodb";

import { getCollection } from "@/lib/data/collections";
import type {
  PaymentDocument,
  PaymentPurpose,
  PaymentStatus,
  UserDocument,
} from "@/lib/domain";

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

export type AdminPaymentOverviewData = {
  stats: {
    totalPaidRwf: number;
    paidCount: number;
    pendingCount: number;
    failedCount: number;
    listingRevenueRwf: number;
    seekerRevenueRwf: number;
  };
  recentPayments: AdminPaymentSummary[];
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
    settledAt: status === "paid" ? now : undefined,
    failedAt: status === "failed" ? now : undefined,
    cancelledAt: status === "cancelled" ? now : undefined,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };
  const result = await payments.insertOne(document);

  return {
    ...document,
    _id: result.insertedId,
  };
}

export async function getAdminPaymentOverviewData(): Promise<AdminPaymentOverviewData> {
  const payments = await getCollection("payments");
  const users = await getCollection("users");
  const [recentPayments, totals, listingRevenue, seekerRevenue, pendingCount, failedCount] = await Promise.all([
    payments
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
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
  ]);
  const userIds = [...new Set(recentPayments.map((payment) => payment.userId.toString()))].map((id) => new ObjectId(id));
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
      listingRevenueRwf: listingRevenue[0]?.amountRwf ?? 0,
      seekerRevenueRwf: seekerRevenue[0]?.amountRwf ?? 0,
    },
    recentPayments: recentPayments.map((payment) => serializeAdminPayment(payment, userMap)),
  };
}
