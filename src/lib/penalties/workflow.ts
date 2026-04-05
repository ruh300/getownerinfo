import { ObjectId, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { adminRoles } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type { CommissionCaseDocument, ListingDocument, PenaltyDocument } from "@/lib/domain";
import { formatRwf } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";
import {
  getFeeSettingsSummary,
  resolvePenaltyDueDays,
  resolvePenaltyFixedAmountRwf,
  resolvePenaltyPercentageBps,
} from "@/lib/fee-settings/workflow";
import { createNotification, notifyUsersByRoles } from "@/lib/notifications/workflow";
import { createPaymentRecord } from "@/lib/payments/workflow";

export type PenaltyEffectiveStatus = PenaltyDocument["status"] | "overdue";

export type PenaltyGuardData = {
  dueCount: number;
  overdueCount: number;
  unpaidAmountRwf: number;
  blocked: boolean;
};

export type OwnerPenaltySummary = {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  offenseType: PenaltyDocument["offenseType"];
  reason: string;
  penaltyAmountRwf: number;
  dueAt: string;
  settledAt: string | null;
  status: PenaltyDocument["status"];
  effectiveStatus: PenaltyEffectiveStatus;
  paymentReference: string | null;
  statusNote: string | null;
  createdAt: string;
};

export type OwnerPenaltyOverviewData = {
  stats: {
    totalCaseCount: number;
    dueCount: number;
    overdueCount: number;
    paidCount: number;
    waivedCount: number;
    unpaidAmountRwf: number;
  };
  penalties: OwnerPenaltySummary[];
};

export type AdminPenaltySummary = OwnerPenaltySummary & {
  ownerUserId: string;
  ownerName: string;
  ownerRole: string | null;
};

export type AdminPenaltyOverviewData = {
  stats: {
    dueCount: number;
    overdueCount: number;
    paidCount: number;
    waivedCount: number;
    unpaidAmountRwf: number;
  };
  penalties: AdminPenaltySummary[];
};

function getPenaltyEffectiveStatus(
  penalty: Pick<PenaltyDocument, "status" | "dueAt">,
  now = new Date(),
): PenaltyEffectiveStatus {
  if (penalty.status === "due" && penalty.dueAt.getTime() < now.getTime()) {
    return "overdue";
  }

  return penalty.status;
}

export { getPenaltyEffectiveStatus as resolvePenaltyEffectiveStatus };

function summarizePenaltyStats(penalties: WithId<PenaltyDocument>[], now: Date) {
  const stats = {
    dueCount: 0,
    overdueCount: 0,
    paidCount: 0,
    waivedCount: 0,
    unpaidAmountRwf: 0,
  };

  for (const penalty of penalties) {
    const effectiveStatus = getPenaltyEffectiveStatus(penalty, now);

    if (effectiveStatus === "due") {
      stats.dueCount += 1;
      stats.unpaidAmountRwf += penalty.penaltyAmountRwf;
    } else if (effectiveStatus === "overdue") {
      stats.overdueCount += 1;
      stats.unpaidAmountRwf += penalty.penaltyAmountRwf;
    } else if (effectiveStatus === "paid") {
      stats.paidCount += 1;
    } else if (effectiveStatus === "waived") {
      stats.waivedCount += 1;
    }
  }

  return stats;
}

async function getListingsMapForPenalties(penalties: WithId<PenaltyDocument>[]) {
  const listings = await getCollection("listings");
  const listingIds = [
    ...new Set(
      penalties
        .map((penalty) => penalty.listingId?.toString())
        .filter((listingId): listingId is string => Boolean(listingId)),
    ),
  ].map((id) => new ObjectId(id));

  if (listingIds.length === 0) {
    return new Map<string, WithId<ListingDocument>>();
  }

  const documents = await listings
    .find({
      _id: { $in: listingIds },
    })
    .toArray();

  return new Map(documents.map((listing) => [listing._id.toString(), listing]));
}

function serializeOwnerPenalty(
  penalty: WithId<PenaltyDocument>,
  listingMap: Map<string, WithId<ListingDocument>>,
  now: Date,
): OwnerPenaltySummary {
  const listing = penalty.listingId ? listingMap.get(penalty.listingId.toString()) : null;

  return {
    id: penalty._id.toString(),
    listingId: penalty.listingId?.toString() ?? null,
    listingTitle: listing?.title ?? null,
    offenseType: penalty.offenseType,
    reason: penalty.reason,
    penaltyAmountRwf: penalty.penaltyAmountRwf,
    dueAt: penalty.dueAt.toISOString(),
    settledAt: penalty.settledAt?.toISOString() ?? null,
    status: penalty.status,
    effectiveStatus: getPenaltyEffectiveStatus(penalty, now),
    paymentReference: penalty.settlementPaymentReference ?? null,
    statusNote: penalty.statusNote ?? null,
    createdAt: penalty.createdAt.toISOString(),
  };
}

async function buildPenaltyReasonForOverdueCommission(
  commissionCase: WithId<CommissionCaseDocument>,
  listing: WithId<ListingDocument> | null,
) {
  const listingTitle = listing?.title ?? `Listing ${commissionCase.listingId.toString()}`;
  return `${listingTitle} remained ${humanizeEnum(commissionCase.outcomeStatus)} with an unpaid commission after ${formatDate(commissionCase.dueAt)}.`;
}

async function createPenaltyForOverdueCommissionCase(
  commissionCase: WithId<CommissionCaseDocument>,
  listing: WithId<ListingDocument> | null,
) {
  const penalties = await getCollection("penalties");
  const existing = await penalties.findOne({
    commissionCaseId: commissionCase._id,
    offenseType: "commission_overdue",
  });

  if (existing) {
    return existing;
  }

  const settings = await getFeeSettingsSummary();
  const percentageBps = resolvePenaltyPercentageBps(settings);
  const fixedAmountRwf = resolvePenaltyFixedAmountRwf(settings);
  const penaltyDueDays = resolvePenaltyDueDays(settings);
  const baseAmountRwf = commissionCase.commissionAmountRwf;
  const penaltyAmountRwf = Math.round((baseAmountRwf * percentageBps) / 10_000) + fixedAmountRwf;
  const now = new Date();
  const dueAt = new Date(now.getTime() + penaltyDueDays * 24 * 60 * 60 * 1000);
  const document: Omit<PenaltyDocument, "_id"> = {
    ownerUserId: commissionCase.ownerUserId,
    listingId: commissionCase.listingId,
    commissionCaseId: commissionCase._id,
    offenseType: "commission_overdue",
    reason: await buildPenaltyReasonForOverdueCommission(commissionCase, listing),
    sourceEntityType: "commission_case",
    sourceEntityId: commissionCase._id.toString(),
    baseAmountRwf,
    penaltyAmountRwf,
    percentageBps,
    fixedAmountRwf,
    status: "due",
    dueAt,
    assessedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const result = await penalties.insertOne(document);
  const penalty = {
    ...document,
    _id: result.insertedId,
  };
  const auditLogs = await getCollection("auditLogs");

  await auditLogs.insertOne({
    entityType: "penalty",
    entityId: penalty._id.toString(),
    action: "penalty_created",
    metadata: {
      offenseType: penalty.offenseType,
      ownerUserId: penalty.ownerUserId.toString(),
      listingId: penalty.listingId?.toString(),
      commissionCaseId: penalty.commissionCaseId?.toString(),
      penaltyAmountRwf: penalty.penaltyAmountRwf,
      baseAmountRwf: penalty.baseAmountRwf,
      dueAt: penalty.dueAt.toISOString(),
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: penalty.ownerUserId,
    kind: "penalty_created",
    severity: "warning",
    title: "Penalty applied",
    body: `${penalty.reason} Penalty due: ${formatRwf(penalty.penaltyAmountRwf)} by ${formatDate(penalty.dueAt)}.`,
    entityType: "penalty",
    entityId: penalty._id.toString(),
    link: "/dashboard#penalties",
  });

  await notifyUsersByRoles(adminRoles, {
    kind: "penalty_created",
    severity: "warning",
    title: "Penalty generated",
    body: `${listing?.title ?? "A listing"} triggered an overdue commission penalty for ${formatRwf(penalty.penaltyAmountRwf)}.`,
    entityType: "penalty",
    entityId: penalty._id.toString(),
    link: "/admin#penalties",
  });

  return penalty;
}

async function ensureOverdueCommissionPenalties(filter: { ownerUserId?: ObjectId } = {}) {
  const commissionCases = await getCollection("commissionCases");
  const listings = await getCollection("listings");
  const now = new Date();
  const overdueCommissionCases = await commissionCases
    .find({
      status: "due",
      dueAt: { $lt: now },
      ...(filter.ownerUserId ? { ownerUserId: filter.ownerUserId } : {}),
    })
    .sort({ dueAt: 1 })
    .limit(filter.ownerUserId ? 20 : 50)
    .toArray();

  if (overdueCommissionCases.length === 0) {
    return [];
  }

  const listingIds = [...new Set(overdueCommissionCases.map((commissionCase) => commissionCase.listingId.toString()))].map(
    (id) => new ObjectId(id),
  );
  const listingsForCases =
    listingIds.length > 0
      ? await listings
          .find({
            _id: { $in: listingIds },
          })
          .toArray()
      : [];
  const listingMap = new Map(listingsForCases.map((listing) => [listing._id.toString(), listing]));
  const createdOrExisting: Array<WithId<PenaltyDocument>> = [];

  for (const commissionCase of overdueCommissionCases) {
    const penalty = await createPenaltyForOverdueCommissionCase(
      commissionCase,
      listingMap.get(commissionCase.listingId.toString()) ?? null,
    );
    createdOrExisting.push(penalty);
  }

  return createdOrExisting;
}

export async function getPenaltyGuardDataForOwner(userId: ObjectId): Promise<PenaltyGuardData> {
  await ensureOverdueCommissionPenalties({ ownerUserId: userId });
  const penalties = await getCollection("penalties");
  const now = new Date();
  const items = await penalties
    .find({
      ownerUserId: userId,
      status: "due",
    })
    .toArray();
  const stats = summarizePenaltyStats(items, now);

  return {
    dueCount: stats.dueCount,
    overdueCount: stats.overdueCount,
    unpaidAmountRwf: stats.unpaidAmountRwf,
    blocked: items.length > 0,
  };
}

export async function assertNoUnpaidPenaltyBlock(userId: ObjectId) {
  const guard = await getPenaltyGuardDataForOwner(userId);

  if (guard.blocked) {
    throw new Error("You have an unpaid penalty. Please resolve it to continue using the platform.");
  }

  return guard;
}

export async function getOwnerPenaltyOverviewData(userId: ObjectId, limit = 8): Promise<OwnerPenaltyOverviewData> {
  await ensureOverdueCommissionPenalties({ ownerUserId: userId });
  const penalties = await getCollection("penalties");
  const now = new Date();
  const items = await penalties
    .find({
      ownerUserId: userId,
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  const listingMap = await getListingsMapForPenalties(items);
  const stats = summarizePenaltyStats(items, now);

  return {
    stats: {
      totalCaseCount: items.length,
      ...stats,
    },
    penalties: items.map((penalty) => serializeOwnerPenalty(penalty, listingMap, now)),
  };
}

export async function getAdminPenaltyOverviewData(limit = 12): Promise<AdminPenaltyOverviewData> {
  await ensureOverdueCommissionPenalties();
  const penalties = await getCollection("penalties");
  const users = await getCollection("users");
  const now = new Date();
  const items = await penalties.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  const listingMap = await getListingsMapForPenalties(items);
  const ownerIds = [...new Set(items.map((penalty) => penalty.ownerUserId.toString()))].map((id) => new ObjectId(id));
  const owners =
    ownerIds.length > 0
      ? await users
          .find({
            _id: { $in: ownerIds },
          })
          .toArray()
      : [];
  const ownerMap = new Map(owners.map((owner) => [owner._id.toString(), owner]));
  const stats = summarizePenaltyStats(items, now);

  return {
    stats,
    penalties: items.map((penalty) => {
      const summary = serializeOwnerPenalty(penalty, listingMap, now);
      const owner = ownerMap.get(penalty.ownerUserId.toString());

      return {
        ...summary,
        ownerUserId: penalty.ownerUserId.toString(),
        ownerName: owner?.fullName ?? "Unknown owner",
        ownerRole: owner?.role ?? null,
      };
    }),
  };
}

export async function applyAdminPenaltyStatus(
  session: AuthSession,
  penaltyId: string,
  nextStatus: Extract<PenaltyDocument["status"], "paid" | "waived">,
  statusNote?: string,
) {
  const reviewer = await ensureUserRecord(session);

  if (!ObjectId.isValid(penaltyId)) {
    throw new Error("The selected penalty could not be found.");
  }

  const penalties = await getCollection("penalties");
  const listings = await getCollection("listings");
  const auditLogs = await getCollection("auditLogs");
  const penalty = await penalties.findOne({
    _id: new ObjectId(penaltyId),
  });

  if (!penalty) {
    throw new Error("The selected penalty could not be found.");
  }

  if (penalty.status !== "due") {
    throw new Error("Only due penalties can be manually settled or waived.");
  }

  const listing = penalty.listingId
    ? await listings.findOne({
        _id: penalty.listingId,
      })
    : null;
  const now = new Date();
  let settlementPaymentReference: string | undefined;

  if (nextStatus === "paid") {
    const payment = await createPaymentRecord({
      userId: penalty.ownerUserId,
      listingId: penalty.listingId,
      amountRwf: penalty.penaltyAmountRwf,
      purpose: "penalty",
      referencePrefix: "penalty",
      relatedEntityId: penalty._id.toString(),
      providerReference: `manual:penalty:${penalty._id.toString()}`,
      providerTransactionId: `manual-penalty-${Date.now()}`,
      metadata: {
        penaltyId: penalty._id.toString(),
        listingTitle: listing?.title,
        offenseType: penalty.offenseType,
      },
      auditActorUserId: reviewer._id,
    });
    settlementPaymentReference = payment.reference;
  }

  const updatedPenalty = await penalties.findOneAndUpdate(
    {
      _id: penalty._id,
      status: "due",
    },
    {
      $set: {
        status: nextStatus,
        statusNote: statusNote?.trim() || undefined,
        settledAt: now,
        settlementPaymentReference: settlementPaymentReference ?? penalty.settlementPaymentReference,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!updatedPenalty) {
    throw new Error("Could not update the penalty status.");
  }

  await auditLogs.insertOne({
    actorUserId: reviewer._id,
    entityType: "penalty",
    entityId: updatedPenalty._id.toString(),
    action: nextStatus === "paid" ? "penalty_paid" : "penalty_waived",
    metadata: {
      ownerUserId: updatedPenalty.ownerUserId.toString(),
      listingId: updatedPenalty.listingId?.toString(),
      commissionCaseId: updatedPenalty.commissionCaseId?.toString(),
      previousStatus: penalty.status,
      nextStatus,
      paymentReference: settlementPaymentReference,
      statusNote: statusNote?.trim() || undefined,
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: updatedPenalty.ownerUserId,
    kind: nextStatus === "paid" ? "penalty_paid" : "penalty_waived",
    severity: nextStatus === "paid" ? "success" : "warning",
    title: nextStatus === "paid" ? "Penalty settled" : "Penalty waived",
    body:
      nextStatus === "paid"
        ? `${updatedPenalty.reason} Penalty settled for ${formatRwf(updatedPenalty.penaltyAmountRwf)}.`
        : `${updatedPenalty.reason} Penalty waived by the admin team.${statusNote?.trim() ? ` Note: ${statusNote.trim()}` : ""}`,
    entityType: "penalty",
    entityId: updatedPenalty._id.toString(),
    link: "/dashboard#penalties",
  });

  return {
    penalty: updatedPenalty,
    previousStatus: penalty.status,
  };
}

export async function adjustAdminPenaltyAmount(
  session: AuthSession,
  penaltyId: string,
  nextAmountRwf: number,
  statusNote?: string,
) {
  const reviewer = await ensureUserRecord(session);

  if (!ObjectId.isValid(penaltyId)) {
    throw new Error("The selected penalty could not be found.");
  }

  if (!Number.isInteger(nextAmountRwf) || nextAmountRwf <= 0) {
    throw new Error("Provide a valid penalty amount in Rwf.");
  }

  const penalties = await getCollection("penalties");
  const auditLogs = await getCollection("auditLogs");
  const penalty = await penalties.findOne({
    _id: new ObjectId(penaltyId),
  });

  if (!penalty) {
    throw new Error("The selected penalty could not be found.");
  }

  if (penalty.status !== "due") {
    throw new Error("Only due penalties can be adjusted.");
  }

  const trimmedStatusNote = statusNote?.trim() || undefined;

  if (penalty.penaltyAmountRwf === nextAmountRwf && trimmedStatusNote === (penalty.statusNote ?? undefined)) {
    throw new Error("Adjust the amount or add a note before saving.");
  }

  const now = new Date();
  const updatedPenalty = await penalties.findOneAndUpdate(
    {
      _id: penalty._id,
      status: "due",
    },
    {
      $set: {
        penaltyAmountRwf: nextAmountRwf,
        statusNote: trimmedStatusNote ?? penalty.statusNote,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!updatedPenalty) {
    throw new Error("Could not adjust the penalty.");
  }

  await auditLogs.insertOne({
    actorUserId: reviewer._id,
    entityType: "penalty",
    entityId: updatedPenalty._id.toString(),
    action: "penalty_adjusted",
    metadata: {
      ownerUserId: updatedPenalty.ownerUserId.toString(),
      listingId: updatedPenalty.listingId?.toString(),
      commissionCaseId: updatedPenalty.commissionCaseId?.toString(),
      previousAmountRwf: penalty.penaltyAmountRwf,
      nextAmountRwf,
      statusNote: trimmedStatusNote,
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: updatedPenalty.ownerUserId,
    kind: "penalty_adjusted",
    severity: "warning",
    title: "Penalty updated",
    body: `${updatedPenalty.reason} Penalty adjusted from ${formatRwf(penalty.penaltyAmountRwf)} to ${formatRwf(nextAmountRwf)}.${trimmedStatusNote ? ` Note: ${trimmedStatusNote}` : ""}`,
    entityType: "penalty",
    entityId: updatedPenalty._id.toString(),
    link: "/dashboard#penalties",
  });

  return {
    penalty: updatedPenalty,
    previousAmountRwf: penalty.penaltyAmountRwf,
  };
}

export async function waiveOpenPenaltiesForCommissionCase(
  commissionCaseId: ObjectId,
  actorUserId: ObjectId,
  statusNote?: string,
) {
  const penalties = await getCollection("penalties");
  const auditLogs = await getCollection("auditLogs");
  const openPenalties = await penalties
    .find({
      commissionCaseId,
      status: "due",
    })
    .toArray();

  if (openPenalties.length === 0) {
    return 0;
  }

  const now = new Date();
  await penalties.updateMany(
    {
      commissionCaseId,
      status: "due",
    },
    {
      $set: {
        status: "waived",
        statusNote: statusNote?.trim() || "Underlying commission case was waived.",
        settledAt: now,
        updatedAt: now,
      },
    },
  );

  await auditLogs.insertMany(
    openPenalties.map((penalty) => ({
      actorUserId,
      entityType: "penalty" as const,
      entityId: penalty._id.toString(),
      action: "penalty_waived",
      metadata: {
        ownerUserId: penalty.ownerUserId.toString(),
        commissionCaseId: penalty.commissionCaseId?.toString(),
        previousStatus: penalty.status,
        nextStatus: "waived",
        statusNote: statusNote?.trim() || "Underlying commission case was waived.",
      },
      createdAt: now,
      updatedAt: now,
    })),
  );

  await Promise.all(
    openPenalties.map((penalty) =>
      createNotification({
        userId: penalty.ownerUserId,
        kind: "penalty_waived",
        severity: "warning",
        title: "Penalty waived",
        body: `${penalty.reason} Penalty waived because the linked commission case was waived.`,
        entityType: "penalty",
        entityId: penalty._id.toString(),
        link: "/dashboard#penalties",
      }),
    ),
  );

  return openPenalties.length;
}
