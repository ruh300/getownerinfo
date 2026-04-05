import { ObjectId, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { adminRoles } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type {
  CommissionCaseDocument,
  ListingDocument,
  ListingStatus,
} from "@/lib/domain";
import { formatRwf } from "@/lib/formatting/currency";
import { humanizeEnum } from "@/lib/formatting/text";
import {
  getFeeSettingsSummary,
  resolveCommissionDueDays,
  resolveRentalCommissionMonthsEquivalent,
  resolveSaleCommissionRateBps,
} from "@/lib/fee-settings/workflow";
import { createNotification, notifyUsersByRoles } from "@/lib/notifications/workflow";
import { waiveOpenPenaltiesForCommissionCase } from "@/lib/penalties/workflow";
import { createPaymentRecord } from "@/lib/payments/workflow";

export type CommissionCaseEffectiveStatus = CommissionCaseDocument["status"] | "overdue";

export type OwnerCommissionCaseSummary = {
  id: string;
  listingId: string;
  listingTitle: string;
  category: ListingDocument["category"];
  outcomeStatus: CommissionCaseDocument["outcomeStatus"];
  finalAmountRwf: number;
  commissionAmountRwf: number;
  dueAt: string;
  settledAt: string | null;
  status: CommissionCaseDocument["status"];
  effectiveStatus: CommissionCaseEffectiveStatus;
  statusNote: string | null;
  paymentReference: string | null;
  createdAt: string;
};

export type OwnerCommissionOverviewData = {
  stats: {
    totalCaseCount: number;
    dueCount: number;
    overdueCount: number;
    paidCount: number;
    waivedCount: number;
    outstandingAmountRwf: number;
    overdueAmountRwf: number;
  };
  cases: OwnerCommissionCaseSummary[];
};

export type CommissionGuardData = {
  overdueCount: number;
  overdueAmountRwf: number;
  blocked: boolean;
};

export type AdminCommissionCaseSummary = OwnerCommissionCaseSummary & {
  ownerUserId: string;
  ownerName: string;
  ownerRole: string | null;
};

export type AdminCommissionOverviewData = {
  stats: {
    dueCount: number;
    overdueCount: number;
    paidCount: number;
    waivedCount: number;
    outstandingAmountRwf: number;
    overdueAmountRwf: number;
  };
  cases: AdminCommissionCaseSummary[];
};

function getCommissionCaseEffectiveStatus(
  commissionCase: Pick<CommissionCaseDocument, "status" | "dueAt">,
  now = new Date(),
): CommissionCaseEffectiveStatus {
  if (commissionCase.status === "due" && commissionCase.dueAt.getTime() < now.getTime()) {
    return "overdue";
  }

  return commissionCase.status;
}

export { getCommissionCaseEffectiveStatus as resolveCommissionCaseEffectiveStatus };

function serializeOwnerCommissionCase(
  commissionCase: WithId<CommissionCaseDocument>,
  listingMap: Map<string, WithId<ListingDocument>>,
  now: Date,
): OwnerCommissionCaseSummary {
  const listing = listingMap.get(commissionCase.listingId.toString());

  return {
    id: commissionCase._id.toString(),
    listingId: commissionCase.listingId.toString(),
    listingTitle: listing?.title ?? `Listing ${commissionCase.listingId.toString()}`,
    category: commissionCase.category,
    outcomeStatus: commissionCase.outcomeStatus,
    finalAmountRwf: commissionCase.finalAmountRwf,
    commissionAmountRwf: commissionCase.commissionAmountRwf,
    dueAt: commissionCase.dueAt.toISOString(),
    settledAt: commissionCase.settledAt?.toISOString() ?? null,
    status: commissionCase.status,
    effectiveStatus: getCommissionCaseEffectiveStatus(commissionCase, now),
    statusNote: commissionCase.statusNote ?? null,
    paymentReference: commissionCase.settlementPaymentReference ?? null,
    createdAt: commissionCase.createdAt.toISOString(),
  };
}

function buildCommissionAmountsSummary(cases: WithId<CommissionCaseDocument>[], now: Date) {
  const stats = {
    dueCount: 0,
    overdueCount: 0,
    paidCount: 0,
    waivedCount: 0,
    outstandingAmountRwf: 0,
    overdueAmountRwf: 0,
  };

  for (const commissionCase of cases) {
    const effectiveStatus = getCommissionCaseEffectiveStatus(commissionCase, now);

    if (effectiveStatus === "due") {
      stats.dueCount += 1;
      stats.outstandingAmountRwf += commissionCase.commissionAmountRwf;
    } else if (effectiveStatus === "overdue") {
      stats.overdueCount += 1;
      stats.outstandingAmountRwf += commissionCase.commissionAmountRwf;
      stats.overdueAmountRwf += commissionCase.commissionAmountRwf;
    } else if (effectiveStatus === "paid") {
      stats.paidCount += 1;
    } else if (effectiveStatus === "waived") {
      stats.waivedCount += 1;
    }
  }

  return stats;
}

async function getListingsMapForCommissionCases(cases: WithId<CommissionCaseDocument>[]) {
  const listings = await getCollection("listings");
  const listingIds = [...new Set(cases.map((commissionCase) => commissionCase.listingId.toString()))].map(
    (id) => new ObjectId(id),
  );

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

function calculateCommissionAmount(input: {
  listing: Pick<ListingDocument, "category">;
  outcomeStatus: Extract<ListingStatus, "sold" | "rented">;
  finalAmountRwf: number;
  saleCommissionRateBps: number;
  rentalCommissionMonthsEquivalent: number;
}) {
  if (input.outcomeStatus === "sold") {
    return Math.round((input.finalAmountRwf * input.saleCommissionRateBps) / 10_000);
  }

  return Math.round(input.finalAmountRwf * input.rentalCommissionMonthsEquivalent);
}

function assertPositiveWholeRwf(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a whole-number Rwandan franc amount greater than zero.`);
  }
}

export async function getCommissionGuardDataForOwner(userId: ObjectId): Promise<CommissionGuardData> {
  const commissionCases = await getCollection("commissionCases");
  const now = new Date();
  const overdueCases = await commissionCases
    .find({
      ownerUserId: userId,
      status: "due",
      dueAt: { $lt: now },
    })
    .toArray();

  return {
    overdueCount: overdueCases.length,
    overdueAmountRwf: overdueCases.reduce((total, commissionCase) => total + commissionCase.commissionAmountRwf, 0),
    blocked: overdueCases.length > 0,
  };
}

export async function assertNoOverdueCommissionBlock(userId: ObjectId) {
  const guard = await getCommissionGuardDataForOwner(userId);

  if (guard.blocked) {
    throw new Error("Your commission payment is overdue. New listings are paused until this is resolved.");
  }

  return guard;
}

export async function createCommissionCaseForListingOutcome(input: {
  listing: WithId<ListingDocument>;
  reportedByUserId: ObjectId;
  outcomeStatus: Extract<ListingStatus, "sold" | "rented">;
  finalAmountRwf: number;
  statusNote?: string;
}) {
  if (input.listing.model !== "A") {
    throw new Error("Only Model A listings can generate commission cases.");
  }

  assertPositiveWholeRwf(input.finalAmountRwf, "Final amount");

  const commissionCases = await getCollection("commissionCases");
  const existing = await commissionCases.findOne({
    listingId: input.listing._id,
  });

  if (existing) {
    throw new Error("A commission case already exists for this listing outcome.");
  }

  const settings = await getFeeSettingsSummary();
  const saleCommissionRateBps = resolveSaleCommissionRateBps(settings, input.listing.category);
  const rentalCommissionMonthsEquivalent = resolveRentalCommissionMonthsEquivalent(settings);
  const dueDays = resolveCommissionDueDays(settings);
  const commissionAmountRwf = calculateCommissionAmount({
    listing: input.listing,
    outcomeStatus: input.outcomeStatus,
    finalAmountRwf: input.finalAmountRwf,
    saleCommissionRateBps,
    rentalCommissionMonthsEquivalent,
  });

  if (commissionAmountRwf <= 0) {
    throw new Error(
      "Commission settings currently resolve to zero for this listing. Update fee settings before reporting a final outcome.",
    );
  }

  const now = new Date();
  const dueAt = new Date(now.getTime() + dueDays * 24 * 60 * 60 * 1000);
  const document: Omit<CommissionCaseDocument, "_id"> = {
    listingId: input.listing._id,
    ownerUserId: input.listing.ownerUserId,
    category: input.listing.category,
    listingModel: input.listing.model,
    outcomeStatus: input.outcomeStatus,
    finalAmountRwf: input.finalAmountRwf,
    commissionAmountRwf,
    saleCommissionRateBps: input.outcomeStatus === "sold" ? saleCommissionRateBps : undefined,
    rentalCommissionMonthsEquivalent:
      input.outcomeStatus === "rented" ? rentalCommissionMonthsEquivalent : undefined,
    dueDays,
    status: "due",
    reportedByUserId: input.reportedByUserId,
    statusNote: input.statusNote?.trim() || undefined,
    dueAt,
    createdAt: now,
    updatedAt: now,
  };
  const result = await commissionCases.insertOne(document);

  return {
    ...document,
    _id: result.insertedId,
  };
}

export async function publishCommissionCaseCreated(input: {
  commissionCase: WithId<CommissionCaseDocument>;
  listing: WithId<ListingDocument>;
  actorUserId: ObjectId;
}) {
  const auditLogs = await getCollection("auditLogs");
  const now = new Date();
  const summary =
    input.commissionCase.outcomeStatus === "sold"
      ? `Final sale amount reported at ${formatRwf(input.commissionCase.finalAmountRwf)}.`
      : `Final rent amount reported at ${formatRwf(input.commissionCase.finalAmountRwf)}.`;

  await auditLogs.insertOne({
    actorUserId: input.actorUserId,
    entityType: "commission_case",
    entityId: input.commissionCase._id.toString(),
    action: "commission_case_created",
    metadata: {
      listingId: input.listing._id.toString(),
      ownerUserId: input.listing.ownerUserId.toString(),
      outcomeStatus: input.commissionCase.outcomeStatus,
      finalAmountRwf: input.commissionCase.finalAmountRwf,
      commissionAmountRwf: input.commissionCase.commissionAmountRwf,
      dueAt: input.commissionCase.dueAt.toISOString(),
      statusNote: input.commissionCase.statusNote,
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: input.listing.ownerUserId,
    kind: "commission_case_created",
    severity: "warning",
    title: "Commission invoice generated",
    body: `${input.listing.title} is now ${humanizeEnum(input.commissionCase.outcomeStatus)}. ${summary} Commission due: ${formatRwf(input.commissionCase.commissionAmountRwf)} by ${input.commissionCase.dueAt.toLocaleDateString("en-RW")}.`,
    entityType: "commission_case",
    entityId: input.commissionCase._id.toString(),
    link: "/dashboard#commissions",
  });

  await notifyUsersByRoles(adminRoles, {
    kind: "commission_case_created",
    severity: "warning",
    title: "New commission case created",
    body: `${input.listing.title} generated a commission case for ${formatRwf(input.commissionCase.commissionAmountRwf)}.`,
    entityType: "commission_case",
    entityId: input.commissionCase._id.toString(),
    link: "/admin#commissions",
  });
}

export async function getOwnerCommissionOverviewData(userId: ObjectId, limit = 8): Promise<OwnerCommissionOverviewData> {
  const commissionCases = await getCollection("commissionCases");
  const now = new Date();
  const cases = await commissionCases
    .find({
      ownerUserId: userId,
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  const listingMap = await getListingsMapForCommissionCases(cases);
  const stats = buildCommissionAmountsSummary(cases, now);

  return {
    stats: {
      totalCaseCount: cases.length,
      ...stats,
    },
    cases: cases.map((commissionCase) => serializeOwnerCommissionCase(commissionCase, listingMap, now)),
  };
}

export async function getAdminCommissionOverviewData(limit = 10): Promise<AdminCommissionOverviewData> {
  const commissionCases = await getCollection("commissionCases");
  const users = await getCollection("users");
  const now = new Date();
  const cases = await commissionCases.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  const listingMap = await getListingsMapForCommissionCases(cases);
  const ownerIds = [...new Set(cases.map((commissionCase) => commissionCase.ownerUserId.toString()))].map(
    (id) => new ObjectId(id),
  );
  const owners =
    ownerIds.length > 0
      ? await users
          .find({
            _id: { $in: ownerIds },
          })
          .toArray()
      : [];
  const ownerMap = new Map(owners.map((owner) => [owner._id.toString(), owner]));
  const stats = buildCommissionAmountsSummary(cases, now);

  return {
    stats,
    cases: cases.map((commissionCase) => {
      const summary = serializeOwnerCommissionCase(commissionCase, listingMap, now);
      const owner = ownerMap.get(commissionCase.ownerUserId.toString());

      return {
        ...summary,
        ownerUserId: commissionCase.ownerUserId.toString(),
        ownerName: owner?.fullName ?? "Unknown owner",
        ownerRole: owner?.role ?? null,
      } satisfies AdminCommissionCaseSummary;
    }),
  };
}

export async function applyAdminCommissionCaseStatus(
  session: AuthSession,
  commissionCaseId: string,
  nextStatus: Extract<CommissionCaseDocument["status"], "paid" | "waived">,
  statusNote?: string,
) {
  const reviewer = await ensureUserRecord(session);

  if (!ObjectId.isValid(commissionCaseId)) {
    throw new Error("The selected commission case could not be found.");
  }

  const commissionCases = await getCollection("commissionCases");
  const listings = await getCollection("listings");
  const auditLogs = await getCollection("auditLogs");
  const commissionCase = await commissionCases.findOne({
    _id: new ObjectId(commissionCaseId),
  });

  if (!commissionCase) {
    throw new Error("The selected commission case could not be found.");
  }

  if (commissionCase.status !== "due") {
    throw new Error("Only due commission cases can be manually settled or waived.");
  }

  const listing = await listings.findOne({
    _id: commissionCase.listingId,
  });

  if (!listing) {
    throw new Error("The linked listing could not be found for this commission case.");
  }

  const now = new Date();
  let settlementPaymentReference: string | undefined;

  if (nextStatus === "paid") {
    const payment = await createPaymentRecord({
      userId: commissionCase.ownerUserId,
      listingId: commissionCase.listingId,
      amountRwf: commissionCase.commissionAmountRwf,
      purpose: "commission",
      referencePrefix: "commission",
      relatedEntityId: commissionCase._id.toString(),
      providerReference: `manual:commission:${commissionCase._id.toString()}`,
      providerTransactionId: `manual-commission-${Date.now()}`,
      metadata: {
        commissionCaseId: commissionCase._id.toString(),
        listingTitle: listing.title,
        outcomeStatus: commissionCase.outcomeStatus,
        finalAmountRwf: commissionCase.finalAmountRwf,
      },
      auditActorUserId: reviewer._id,
    });
    settlementPaymentReference = payment.reference;
  }

  const updatedCommissionCase = await commissionCases.findOneAndUpdate(
    {
      _id: commissionCase._id,
      status: "due",
    },
    {
      $set: {
        status: nextStatus,
        statusNote: statusNote?.trim() || undefined,
        settledAt: now,
        settlementPaymentReference: settlementPaymentReference ?? commissionCase.settlementPaymentReference,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!updatedCommissionCase) {
    throw new Error("Could not update the commission case status.");
  }

  await auditLogs.insertOne({
    actorUserId: reviewer._id,
    entityType: "commission_case",
    entityId: updatedCommissionCase._id.toString(),
    action: nextStatus === "paid" ? "commission_case_paid" : "commission_case_waived",
    metadata: {
      listingId: listing._id.toString(),
      ownerUserId: updatedCommissionCase.ownerUserId.toString(),
      previousStatus: commissionCase.status,
      nextStatus,
      commissionAmountRwf: updatedCommissionCase.commissionAmountRwf,
      settlementPaymentReference,
      statusNote: statusNote?.trim() || undefined,
    },
    createdAt: now,
    updatedAt: now,
  });

  await createNotification({
    userId: updatedCommissionCase.ownerUserId,
    kind: nextStatus === "paid" ? "commission_case_paid" : "commission_case_waived",
    severity: nextStatus === "paid" ? "success" : "warning",
    title: nextStatus === "paid" ? "Commission marked as paid" : "Commission case waived",
    body:
      nextStatus === "paid"
        ? `${listing.title} commission was marked as paid for ${formatRwf(updatedCommissionCase.commissionAmountRwf)}.`
        : `${listing.title} commission case was waived by the admin team.${statusNote?.trim() ? ` Note: ${statusNote.trim()}` : ""}`,
    entityType: "commission_case",
    entityId: updatedCommissionCase._id.toString(),
    link: "/dashboard#commissions",
  });

  if (nextStatus === "waived") {
    await waiveOpenPenaltiesForCommissionCase(
      updatedCommissionCase._id,
      reviewer._id,
      "Linked commission case was waived.",
    );
  }

  return {
    commissionCase: updatedCommissionCase,
    previousStatus: commissionCase.status,
  };
}
