import { ObjectId, type Filter, type WithId } from "mongodb";

import type { AuthSession } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import type {
  InvestigationCaseDocument,
  InvestigationCasePriority,
  InvestigationCaseStatus,
  InvestigationCaseType,
  InvestigationUpdateChannel,
  InvestigationUpdateDocument,
  InvestigationUpdateOutcome,
  InvestigationUpdateTarget,
  UserDocument,
  UserRole,
} from "@/lib/domain";
import {
  investigationCasePriorities,
  investigationCaseStatuses,
  investigationCaseTypes,
} from "@/lib/domain";

type InvestigationSourceEntityType = InvestigationCaseDocument["entityType"];
type SearchParamValue = string | string[] | undefined;

type InvestigationTarget = {
  title: string;
  subjectUserId?: ObjectId;
  linkedListingId?: ObjectId;
  linkedCommissionCaseId?: ObjectId;
  linkedPenaltyId?: ObjectId;
  linkedPaymentReference?: string;
};

export type InvestigationCaseSummary = {
  id: string;
  entityType: InvestigationCaseDocument["entityType"];
  entityId: string;
  caseType: InvestigationCaseType;
  priority: InvestigationCasePriority;
  status: InvestigationCaseStatus;
  title: string;
  summary: string;
  subjectName: string | null;
  subjectRole: UserRole | null;
  openedByName: string;
  openedByRole: UserRole | null;
  updatedByName: string;
  updatedByRole: UserRole | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  relatedHref: string | null;
  relatedLabel: string | null;
  updateCount: number;
  recentUpdates: InvestigationUpdateSummary[];
};

export type InvestigationUpdateSummary = {
  id: string;
  target: InvestigationUpdateTarget;
  channel: InvestigationUpdateChannel;
  outcome: InvestigationUpdateOutcome;
  note: string;
  caseStatusAfter: InvestigationCaseStatus;
  authorName: string;
  authorRole: UserRole | null;
  createdAt: string;
};

export type AdminInvestigationOverviewData = {
  filters: AdminInvestigationExplorerFilters;
  totalCount: number;
  stats: {
    openCount: number;
    investigatingCount: number;
    resolvedCount: number;
    dismissedCount: number;
  };
  cases: InvestigationCaseSummary[];
  availableStatuses: InvestigationCaseStatus[];
  availableCaseTypes: InvestigationCaseType[];
  availablePriorities: InvestigationCasePriority[];
};

export type AdminInvestigationStatusFilter = InvestigationCaseStatus | "all";
export type AdminInvestigationTypeFilter = InvestigationCaseType | "all";
export type AdminInvestigationPriorityFilter = InvestigationCasePriority | "all";

export type AdminInvestigationExplorerFilters = {
  status: AdminInvestigationStatusFilter;
  caseType: AdminInvestigationTypeFilter;
  priority: AdminInvestigationPriorityFilter;
  query: string;
  limit: number;
};

const availableStatuses: InvestigationCaseStatus[] = [...investigationCaseStatuses];
const availableCaseTypes: InvestigationCaseType[] = [...investigationCaseTypes];
const availablePriorities: InvestigationCasePriority[] = [...investigationCasePriorities];
const defaultLimit = 12;
const maxLimit = 100;

function parseObjectId(value: string, message: string) {
  if (!ObjectId.isValid(value)) {
    throw new Error(message);
  }

  return new ObjectId(value);
}

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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseStatusFilter(value: SearchParamValue): AdminInvestigationStatusFilter {
  const normalized = normalizeTrimmedSearchParam(value);
  return availableStatuses.includes(normalized as InvestigationCaseStatus)
    ? (normalized as InvestigationCaseStatus)
    : "all";
}

function parseCaseTypeFilter(value: SearchParamValue): AdminInvestigationTypeFilter {
  const normalized = normalizeTrimmedSearchParam(value);
  return availableCaseTypes.includes(normalized as InvestigationCaseType)
    ? (normalized as InvestigationCaseType)
    : "all";
}

function parsePriorityFilter(value: SearchParamValue): AdminInvestigationPriorityFilter {
  const normalized = normalizeTrimmedSearchParam(value);
  return availablePriorities.includes(normalized as InvestigationCasePriority)
    ? (normalized as InvestigationCasePriority)
    : "all";
}

export function parseAdminInvestigationExplorerFilters(
  searchParams: Record<string, SearchParamValue>,
): AdminInvestigationExplorerFilters {
  return {
    status: parseStatusFilter(searchParams.investigationStatus),
    caseType: parseCaseTypeFilter(searchParams.investigationType),
    priority: parsePriorityFilter(searchParams.investigationPriority),
    query: normalizeTrimmedSearchParam(searchParams.investigationQuery),
    limit: parseLimit(searchParams.investigationLimit),
  };
}

async function resolveListingTitle(listingId: ObjectId) {
  const listings = await getCollection("listings");
  const listing = await listings.findOne({ _id: listingId });
  return listing?.title ?? `Listing ${listingId.toString()}`;
}

async function resolveInvestigationTarget(
  entityType: InvestigationSourceEntityType,
  entityId: string,
): Promise<InvestigationTarget> {
  switch (entityType) {
    case "listing": {
      const listings = await getCollection("listings");
      const listing = await listings.findOne({
        _id: parseObjectId(entityId, "The selected listing could not be found."),
      });

      if (!listing) {
        throw new Error("The selected listing could not be found.");
      }

      return {
        title: listing.title,
        subjectUserId: listing.ownerUserId,
        linkedListingId: listing._id,
      };
    }
    case "commission_case": {
      const commissionCases = await getCollection("commissionCases");
      const commissionCase = await commissionCases.findOne({
        _id: parseObjectId(entityId, "The selected commission case could not be found."),
      });

      if (!commissionCase) {
        throw new Error("The selected commission case could not be found.");
      }

      const listingTitle = await resolveListingTitle(commissionCase.listingId);
      return {
        title: `Commission review: ${listingTitle}`,
        subjectUserId: commissionCase.ownerUserId,
        linkedListingId: commissionCase.listingId,
        linkedCommissionCaseId: commissionCase._id,
      };
    }
    case "penalty": {
      const penalties = await getCollection("penalties");
      const penalty = await penalties.findOne({
        _id: parseObjectId(entityId, "The selected penalty could not be found."),
      });

      if (!penalty) {
        throw new Error("The selected penalty could not be found.");
      }

      const title = penalty.listingId
        ? `Penalty review: ${await resolveListingTitle(penalty.listingId)}`
        : `Penalty review: ${penalty.offenseType}`;

      return {
        title,
        subjectUserId: penalty.ownerUserId,
        linkedListingId: penalty.listingId,
        linkedCommissionCaseId: penalty.commissionCaseId,
        linkedPenaltyId: penalty._id,
      };
    }
    case "payment": {
      const payments = await getCollection("payments");
      const payment = await payments.findOne({
        reference: entityId,
      });

      if (!payment) {
        throw new Error("The selected payment could not be found.");
      }

      return {
        title: `Payment review: ${payment.reference}`,
        subjectUserId: payment.userId,
        linkedListingId: payment.listingId,
        linkedPaymentReference: payment.reference,
      };
    }
    case "user": {
      const users = await getCollection("users");
      const user = await users.findOne({
        _id: parseObjectId(entityId, "The selected user could not be found."),
      });

      if (!user) {
        throw new Error("The selected user could not be found.");
      }

      return {
        title: `User review: ${user.fullName}`,
        subjectUserId: user._id,
      };
    }
    default:
      throw new Error("Unsupported investigation target.");
  }
}

async function findActiveInvestigationCase(
  entityType: InvestigationSourceEntityType,
  entityId: string,
) {
  const investigationCases = await getCollection("investigationCases");
  return investigationCases.findOne({
    entityType,
    entityId,
    status: { $in: ["open", "investigating"] },
  });
}

function serializeInvestigationUpdate(
  update: WithId<InvestigationUpdateDocument>,
  userMap: Map<string, WithId<UserDocument>>,
): InvestigationUpdateSummary {
  const author = userMap.get(update.authorUserId.toString()) ?? null;

  return {
    id: update._id.toString(),
    target: update.target,
    channel: update.channel,
    outcome: update.outcome,
    note: update.note,
    caseStatusAfter: update.caseStatusAfter,
    authorName: author?.fullName ?? "Unknown user",
    authorRole: author?.role ?? null,
    createdAt: update.createdAt.toISOString(),
  };
}

function serializeInvestigationCase(
  investigationCase: WithId<InvestigationCaseDocument>,
  userMap: Map<string, WithId<UserDocument>>,
  updates: InvestigationUpdateSummary[],
): InvestigationCaseSummary {
  const subject = investigationCase.subjectUserId
    ? userMap.get(investigationCase.subjectUserId.toString()) ?? null
    : null;
  const openedBy = userMap.get(investigationCase.createdByUserId.toString()) ?? null;
  const updatedBy = userMap.get(investigationCase.updatedByUserId.toString()) ?? null;
  const relatedView = (() => {
    switch (investigationCase.entityType) {
      case "listing":
        return {
          relatedHref: `/listings/${investigationCase.entityId}`,
          relatedLabel: "Open listing",
        };
      case "commission_case":
        return {
          relatedHref: "/admin#commissions",
          relatedLabel: "Open commission ledger",
        };
      case "penalty":
        return {
          relatedHref: "/admin#penalties",
          relatedLabel: "Open penalty ledger",
        };
      case "payment": {
        const params = new URLSearchParams({
          paymentQuery: investigationCase.linkedPaymentReference ?? investigationCase.entityId,
        });

        return {
          relatedHref: `/admin?${params.toString()}#payments`,
          relatedLabel: "Open payment explorer",
        };
      }
      case "user": {
        const params = new URLSearchParams({
          query: investigationCase.subjectUserId?.toString() ?? investigationCase.entityId,
        });

        return {
          relatedHref: `/admin?${params.toString()}#audit`,
          relatedLabel: "Open audit explorer",
        };
      }
      default:
        return {
          relatedHref: null,
          relatedLabel: null,
        };
    }
  })();

  return {
    id: investigationCase._id.toString(),
    entityType: investigationCase.entityType,
    entityId: investigationCase.entityId,
    caseType: investigationCase.caseType,
    priority: investigationCase.priority,
    status: investigationCase.status,
    title: investigationCase.title,
    summary: investigationCase.summary,
    subjectName: subject?.fullName ?? null,
    subjectRole: subject?.role ?? null,
    openedByName: openedBy?.fullName ?? "Unknown user",
    openedByRole: openedBy?.role ?? null,
    updatedByName: updatedBy?.fullName ?? "Unknown user",
    updatedByRole: updatedBy?.role ?? null,
    resolutionNote: investigationCase.resolutionNote ?? null,
    createdAt: investigationCase.createdAt.toISOString(),
    updatedAt: investigationCase.updatedAt.toISOString(),
    resolvedAt: investigationCase.resolvedAt?.toISOString() ?? null,
    relatedHref: relatedView.relatedHref,
    relatedLabel: relatedView.relatedLabel,
    updateCount: updates.length,
    recentUpdates: updates,
  };
}

export async function createInvestigationCase(
  session: AuthSession,
  input: {
    entityType: InvestigationSourceEntityType;
    entityId: string;
    caseType: InvestigationCaseType;
    priority: InvestigationCasePriority;
    summary: string;
  },
) {
  const actor = await ensureUserRecord(session);
  const investigationCases = await getCollection("investigationCases");
  const auditLogs = await getCollection("auditLogs");
  const activeCase = await findActiveInvestigationCase(input.entityType, input.entityId);

  if (activeCase) {
    return {
      investigationCase: activeCase,
      created: false,
    };
  }

  const target = await resolveInvestigationTarget(input.entityType, input.entityId);
  const now = new Date();
  const document: Omit<InvestigationCaseDocument, "_id"> = {
    entityType: input.entityType,
    entityId: input.entityId,
    caseType: input.caseType,
    priority: input.priority,
    status: "open",
    title: target.title,
    summary: input.summary.trim(),
    subjectUserId: target.subjectUserId,
    linkedListingId: target.linkedListingId,
    linkedCommissionCaseId: target.linkedCommissionCaseId,
    linkedPenaltyId: target.linkedPenaltyId,
    linkedPaymentReference: target.linkedPaymentReference,
    createdByUserId: actor._id,
    updatedByUserId: actor._id,
    createdAt: now,
    updatedAt: now,
  };
  const result = await investigationCases.insertOne(document);
  const investigationCase = {
    ...document,
    _id: result.insertedId,
  };

  await auditLogs.insertOne({
    actorUserId: actor._id,
    entityType: "investigation_case",
    entityId: investigationCase._id.toString(),
    action: "investigation_case_created",
    metadata: {
      entityType: input.entityType,
      sourceEntityId: input.entityId,
      caseType: input.caseType,
      priority: input.priority,
      title: investigationCase.title,
    },
    createdAt: now,
    updatedAt: now,
  });

  return {
    investigationCase,
    created: true,
  };
}

export async function updateInvestigationCaseStatus(
  session: AuthSession,
  caseId: string,
  nextStatus: InvestigationCaseStatus,
  resolutionNote?: string,
) {
  const actor = await ensureUserRecord(session);
  const investigationCases = await getCollection("investigationCases");
  const auditLogs = await getCollection("auditLogs");
  const investigationCase = await investigationCases.findOne({
    _id: parseObjectId(caseId, "The selected investigation case could not be found."),
  });

  if (!investigationCase) {
    throw new Error("The selected investigation case could not be found.");
  }

  const trimmedResolutionNote = resolutionNote?.trim() || undefined;

  if (investigationCase.status === nextStatus && trimmedResolutionNote === (investigationCase.resolutionNote ?? undefined)) {
    throw new Error("Adjust the investigation status or note before saving.");
  }

  const now = new Date();
  const updatedCase = await investigationCases.findOneAndUpdate(
    {
      _id: investigationCase._id,
    },
    {
      $set: {
        status: nextStatus,
        resolutionNote: trimmedResolutionNote ?? investigationCase.resolutionNote,
        updatedByUserId: actor._id,
        updatedAt: now,
        ...(nextStatus === "resolved" || nextStatus === "dismissed"
          ? { resolvedAt: now }
          : {}),
      },
      ...(!(nextStatus === "resolved" || nextStatus === "dismissed") && investigationCase.resolvedAt
        ? { $unset: { resolvedAt: "" } }
        : {}),
    },
    {
      returnDocument: "after",
    },
  );

  if (!updatedCase) {
    throw new Error("Could not update the investigation case.");
  }

  await auditLogs.insertOne({
    actorUserId: actor._id,
    entityType: "investigation_case",
    entityId: updatedCase._id.toString(),
    action: "investigation_case_status_updated",
    metadata: {
      previousStatus: investigationCase.status,
      nextStatus,
      resolutionNote: trimmedResolutionNote,
    },
    createdAt: now,
    updatedAt: now,
  });

  return {
    investigationCase: updatedCase,
    previousStatus: investigationCase.status,
  };
}

export async function recordInvestigationCaseFollowUp(
  session: AuthSession,
  caseId: string,
  input: {
    target: InvestigationUpdateTarget;
    channel: InvestigationUpdateChannel;
    outcome: InvestigationUpdateOutcome;
    note: string;
    nextStatus?: InvestigationCaseStatus;
  },
) {
  const actor = await ensureUserRecord(session);
  const investigationCases = await getCollection("investigationCases");
  const investigationUpdates = await getCollection("investigationUpdates");
  const auditLogs = await getCollection("auditLogs");
  const investigationCase = await investigationCases.findOne({
    _id: parseObjectId(caseId, "The selected investigation case could not be found."),
  });

  if (!investigationCase) {
    throw new Error("The selected investigation case could not be found.");
  }

  const now = new Date();
  const nextStatus = input.nextStatus ?? investigationCase.status;
  const trimmedNote = input.note.trim();
  const updateDocument: Omit<InvestigationUpdateDocument, "_id"> = {
    caseId: investigationCase._id,
    authorUserId: actor._id,
    target: input.target,
    channel: input.channel,
    outcome: input.outcome,
    note: trimmedNote,
    caseStatusAfter: nextStatus,
    createdAt: now,
    updatedAt: now,
  };
  const updateResult = await investigationUpdates.insertOne(updateDocument);
  const resolutionNote =
    nextStatus === "resolved" || nextStatus === "dismissed"
      ? trimmedNote
      : investigationCase.resolutionNote;
  const nextResolvedAt =
    nextStatus === "resolved" || nextStatus === "dismissed"
      ? investigationCase.resolvedAt ?? now
      : undefined;
  const updatedCase = await investigationCases.findOneAndUpdate(
    {
      _id: investigationCase._id,
    },
    {
      $set: {
        status: nextStatus,
        updatedByUserId: actor._id,
        updatedAt: now,
        resolutionNote,
        ...(nextResolvedAt ? { resolvedAt: nextResolvedAt } : {}),
      },
      ...(!(nextStatus === "resolved" || nextStatus === "dismissed") && investigationCase.resolvedAt
        ? { $unset: { resolvedAt: "" } }
        : {}),
    },
    {
      returnDocument: "after",
    },
  );

  if (!updatedCase) {
    throw new Error("Could not update the investigation case.");
  }

  await auditLogs.insertOne({
    actorUserId: actor._id,
    entityType: "investigation_case",
    entityId: investigationCase._id.toString(),
    action: "investigation_case_follow_up_added",
    metadata: {
      previousStatus: investigationCase.status,
      nextStatus,
      target: input.target,
      channel: input.channel,
      outcome: input.outcome,
      note: trimmedNote,
    },
    createdAt: now,
    updatedAt: now,
  });

  return {
    investigationCase: updatedCase,
    update: {
      ...updateDocument,
      _id: updateResult.insertedId,
    },
    previousStatus: investigationCase.status,
  };
}

async function buildInvestigationTextFilter(query: string): Promise<Filter<InvestigationCaseDocument> | null> {
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
      { entityId: regex },
      { title: regex },
      { summary: regex },
      { resolutionNote: regex },
      { linkedPaymentReference: regex },
      ...(matchingUsers.length > 0
        ? [
            {
              subjectUserId: {
                $in: matchingUsers.map((user) => user._id),
              },
            },
            {
              createdByUserId: {
                $in: matchingUsers.map((user) => user._id),
              },
            },
            {
              updatedByUserId: {
                $in: matchingUsers.map((user) => user._id),
              },
            },
          ]
        : []),
    ],
  };
}

async function buildInvestigationMongoFilter(
  filters: AdminInvestigationExplorerFilters,
): Promise<Filter<InvestigationCaseDocument>> {
  const clauses: Filter<InvestigationCaseDocument>[] = [];

  if (filters.status !== "all") {
    clauses.push({ status: filters.status });
  }

  if (filters.caseType !== "all") {
    clauses.push({ caseType: filters.caseType });
  }

  if (filters.priority !== "all") {
    clauses.push({ priority: filters.priority });
  }

  const textFilter = await buildInvestigationTextFilter(filters.query);

  if (textFilter) {
    clauses.push(textFilter);
  }

  return clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };
}

export async function getAdminInvestigationOverviewData(
  filters: AdminInvestigationExplorerFilters = {
    status: "all",
    caseType: "all",
    priority: "all",
    query: "",
    limit: defaultLimit,
  },
): Promise<AdminInvestigationOverviewData> {
  const investigationCases = await getCollection("investigationCases");
  const investigationUpdates = await getCollection("investigationUpdates");
  const users = await getCollection("users");
  const mongoFilter = await buildInvestigationMongoFilter(filters);
  const [cases, stats, totalCount] = await Promise.all([
    investigationCases.find(mongoFilter).sort({ updatedAt: -1 }).limit(filters.limit).toArray(),
    investigationCases
      .aggregate<{
        _id: null;
        openCount: number;
        investigatingCount: number;
        resolvedCount: number;
        dismissedCount: number;
      }>([
        ...(Object.keys(mongoFilter).length > 0 ? [{ $match: mongoFilter }] : []),
        {
          $group: {
            _id: null,
            openCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "open"] }, 1, 0],
              },
            },
            investigatingCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "investigating"] }, 1, 0],
              },
            },
            resolvedCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
              },
            },
            dismissedCount: {
              $sum: {
                $cond: [{ $eq: ["$status", "dismissed"] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray(),
    investigationCases.countDocuments(mongoFilter),
  ]);
  const caseIds = cases.map((investigationCase) => investigationCase._id);
  const updates =
    caseIds.length > 0
      ? await investigationUpdates
          .find({
            caseId: { $in: caseIds },
          })
          .sort({ createdAt: -1 })
          .toArray()
      : [];
  const userIds = [
    ...new Set(
      [
        ...cases.flatMap((investigationCase) => [
          investigationCase.createdByUserId.toString(),
          investigationCase.updatedByUserId.toString(),
          ...(investigationCase.subjectUserId ? [investigationCase.subjectUserId.toString()] : []),
        ]),
        ...updates.map((update) => update.authorUserId.toString()),
      ],
    ),
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
  const updatesByCase = new Map<string, InvestigationUpdateSummary[]>();

  for (const update of updates) {
    const key = update.caseId.toString();
    const current = updatesByCase.get(key) ?? [];

    if (current.length < 4) {
      current.push(serializeInvestigationUpdate(update, userMap));
      updatesByCase.set(key, current);
    }
  }
  const nextStats = stats[0] ?? {
    openCount: 0,
    investigatingCount: 0,
    resolvedCount: 0,
    dismissedCount: 0,
  };

  return {
    filters,
    totalCount,
    stats: nextStats,
    cases: cases.map((investigationCase) =>
      serializeInvestigationCase(
        investigationCase,
        userMap,
        updatesByCase.get(investigationCase._id.toString()) ?? [],
      ),
    ),
    availableStatuses,
    availableCaseTypes,
    availablePriorities,
  };
}

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function buildAdminInvestigationExportCsv(filters: AdminInvestigationExplorerFilters) {
  const exportFilters = {
    ...filters,
    limit: Math.min(filters.limit, maxLimit),
  };
  const data = await getAdminInvestigationOverviewData(exportFilters);
  const header = [
    "createdAt",
    "updatedAt",
    "resolvedAt",
    "entityType",
    "entityId",
    "caseType",
    "priority",
    "status",
    "title",
    "summary",
    "subjectName",
    "subjectRole",
    "openedByName",
    "openedByRole",
    "updateCount",
    "latestUpdate",
    "latestOutcome",
    "latestTarget",
    "resolutionNote",
  ];
  const rows = data.cases.map((investigationCase) => {
    const latestUpdate = investigationCase.recentUpdates[0] ?? null;

    return [
      investigationCase.createdAt,
      investigationCase.updatedAt,
      investigationCase.resolvedAt ?? "",
      investigationCase.entityType,
      investigationCase.entityId,
      investigationCase.caseType,
      investigationCase.priority,
      investigationCase.status,
      investigationCase.title,
      investigationCase.summary,
      investigationCase.subjectName ?? "",
      investigationCase.subjectRole ?? "",
      investigationCase.openedByName,
      investigationCase.openedByRole ?? "",
      String(investigationCase.updateCount),
      latestUpdate?.note ?? "",
      latestUpdate?.outcome ?? "",
      latestUpdate?.target ?? "",
      investigationCase.resolutionNote ?? "",
    ];
  });

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}
