import { ObjectId, type Filter, type WithId } from "mongodb";

import { getCollection } from "@/lib/data/collections";
import type { AuditLogDocument, UserDocument, UserRole } from "@/lib/domain";

type SearchParamValue = string | string[] | undefined;

export type AdminAuditEntityFilter = AuditLogDocument["entityType"] | "all";
export type AdminAuditRoleFilter = UserRole | "all";

export type AdminAuditExplorerFilters = {
  entityType: AdminAuditEntityFilter;
  actorRole: AdminAuditRoleFilter;
  action: string;
  query: string;
  limit: number;
};

export type AdminAuditExplorerEntry = {
  id: string;
  action: string;
  entityType: AuditLogDocument["entityType"];
  entityId: string;
  actorName: string;
  actorRole: UserRole | null;
  createdAt: string;
  metadataSummary: string | null;
};

export type AdminAuditExplorerData = {
  filters: AdminAuditExplorerFilters;
  totalCount: number;
  entries: AdminAuditExplorerEntry[];
  availableEntityTypes: AuditLogDocument["entityType"][];
  availableActorRoles: UserRole[];
  commonActions: string[];
};

const availableEntityTypes: AuditLogDocument["entityType"][] = [
  "listing",
  "payment",
  "token_unlock",
  "investigation_case",
  "penalty",
  "user",
  "chat_message",
  "seeker_request",
  "platform_setting",
];

const availableActorRoles: UserRole[] = ["admin", "manager", "owner", "buyer"];
const defaultLimit = 24;
const maxLimit = 200;

function getSingleSearchParam(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeTrimmedSearchParam(value: SearchParamValue) {
  return getSingleSearchParam(value).trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLimit(value: SearchParamValue) {
  const parsed = Number(getSingleSearchParam(value));

  if (!Number.isFinite(parsed)) {
    return defaultLimit;
  }

  return Math.min(maxLimit, Math.max(10, Math.round(parsed)));
}

function parseEntityType(value: SearchParamValue): AdminAuditEntityFilter {
  const normalized = normalizeTrimmedSearchParam(value);
  return availableEntityTypes.includes(normalized as AuditLogDocument["entityType"])
    ? (normalized as AuditLogDocument["entityType"])
    : "all";
}

function parseActorRole(value: SearchParamValue): AdminAuditRoleFilter {
  const normalized = normalizeTrimmedSearchParam(value);
  return availableActorRoles.includes(normalized as UserRole) ? (normalized as UserRole) : "all";
}

export function parseAdminAuditExplorerFilters(searchParams: Record<string, SearchParamValue>): AdminAuditExplorerFilters {
  return {
    entityType: parseEntityType(searchParams.entityType),
    actorRole: parseActorRole(searchParams.actorRole),
    action: normalizeTrimmedSearchParam(searchParams.action),
    query: normalizeTrimmedSearchParam(searchParams.query),
    limit: parseLimit(searchParams.limit),
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
    .slice(0, 4)
    .map(([key, value]) => `${key.replace(/[_-]+/g, " ")}: ${serializeMetadataValue(value)}`);

  return parts.length > 0 ? parts.join(" / ") : null;
}

function serializeAuditEntry(log: WithId<AuditLogDocument>, actorMap: Map<string, WithId<UserDocument>>): AdminAuditExplorerEntry {
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

async function buildActorRoleFilter(role: AdminAuditRoleFilter) {
  if (role === "all") {
    return null;
  }

  const users = await getCollection("users");
  const actorIds = await users
    .find(
      {
        role,
      },
      {
        projection: { _id: 1 },
      },
    )
    .toArray();

  if (actorIds.length === 0) {
    return { actorUserId: { $in: [] as ObjectId[] } } satisfies Filter<AuditLogDocument>;
  }

  return {
    actorUserId: { $in: actorIds.map((user) => user._id) },
  } satisfies Filter<AuditLogDocument>;
}

function buildTextFilter(query: string): Filter<AuditLogDocument> | null {
  if (!query) {
    return null;
  }

  const escaped = escapeRegex(query);
  const regex = new RegExp(escaped, "i");

  return {
    $or: [
      { entityId: regex },
      { action: regex },
      { "metadata.reference": regex },
      { "metadata.paymentReference": regex },
      { "metadata.title": regex },
      { "metadata.listingTitle": regex },
      { "metadata.flow": regex },
      { "metadata.source": regex },
      { "metadata.reason": regex },
      { "metadata.reviewNote": regex },
    ],
  };
}

async function getCommonActions() {
  const auditLogs = await getCollection("auditLogs");
  const actionValues = await auditLogs.distinct("action");

  return actionValues
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .sort((left, right) => left.localeCompare(right))
    .slice(0, 40);
}

export async function getAdminAuditExplorerData(filters: AdminAuditExplorerFilters): Promise<AdminAuditExplorerData> {
  const auditLogs = await getCollection("auditLogs");
  const users = await getCollection("users");
  const clauses: Filter<AuditLogDocument>[] = [];

  if (filters.entityType !== "all") {
    clauses.push({ entityType: filters.entityType });
  }

  if (filters.action) {
    clauses.push({ action: new RegExp(`^${escapeRegex(filters.action)}$`, "i") });
  }

  const roleFilter = await buildActorRoleFilter(filters.actorRole);

  if (roleFilter) {
    clauses.push(roleFilter);
  }

  const textFilter = buildTextFilter(filters.query);

  if (textFilter) {
    clauses.push(textFilter);
  }

  const mongoFilter = clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };
  const [logs, totalCount, actions] = await Promise.all([
    auditLogs.find(mongoFilter).sort({ createdAt: -1 }).limit(filters.limit).toArray(),
    auditLogs.countDocuments(mongoFilter),
    getCommonActions(),
  ]);
  const actorIds = [...new Set(logs.map((log) => log.actorUserId?.toString()).filter((value): value is string => Boolean(value)))];
  const actors = actorIds.length
    ? await users
        .find({
          _id: { $in: actorIds.map((id) => new ObjectId(id)) },
        })
        .toArray()
    : [];
  const actorMap = new Map(actors.map((user) => [user._id.toString(), user]));

  return {
    filters,
    totalCount,
    entries: logs.map((log) => serializeAuditEntry(log, actorMap)),
    availableEntityTypes,
    availableActorRoles,
    commonActions: actions,
  };
}

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function buildAdminAuditExportCsv(filters: AdminAuditExplorerFilters) {
  const exportFilters = {
    ...filters,
    limit: Math.min(filters.limit, maxLimit),
  };
  const data = await getAdminAuditExplorerData(exportFilters);
  const header = ["createdAt", "entityType", "action", "entityId", "actorName", "actorRole", "metadataSummary"];
  const rows = data.entries.map((entry) => [
    entry.createdAt,
    entry.entityType,
    entry.action,
    entry.entityId,
    entry.actorName,
    entry.actorRole ?? "",
    entry.metadataSummary ?? "",
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}
