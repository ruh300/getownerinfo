import Link from "next/link";

import type { AdminAuditExplorerData } from "@/lib/admin/audit-explorer";
import type { AdminPaymentExplorerFilters } from "@/lib/admin/payment-explorer";
import type { AdminInvestigationExplorerFilters } from "@/lib/investigations/workflow";
import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";

type AuditExplorerProps = {
  explorer: AdminAuditExplorerData;
  preservedPaymentFilters: AdminPaymentExplorerFilters;
  preservedInvestigationFilters: AdminInvestigationExplorerFilters;
};

function buildExportHref(explorer: AdminAuditExplorerData) {
  const url = new URL("https://getownerinfo.local/api/admin/audit/export");

  if (explorer.filters.entityType !== "all") {
    url.searchParams.set("entityType", explorer.filters.entityType);
  }

  if (explorer.filters.actorRole !== "all") {
    url.searchParams.set("actorRole", explorer.filters.actorRole);
  }

  if (explorer.filters.action) {
    url.searchParams.set("action", explorer.filters.action);
  }

  if (explorer.filters.query) {
    url.searchParams.set("query", explorer.filters.query);
  }

  url.searchParams.set("limit", String(explorer.filters.limit));

  return `${url.pathname}${url.search}`;
}

function buildResetHref(
  preservedPaymentFilters: AdminPaymentExplorerFilters,
  preservedInvestigationFilters: AdminInvestigationExplorerFilters,
) {
  const url = new URL("https://getownerinfo.local/admin");

  if (preservedPaymentFilters.status !== "all") {
    url.searchParams.set("paymentStatus", preservedPaymentFilters.status);
  }

  if (preservedPaymentFilters.purpose !== "all") {
    url.searchParams.set("paymentPurpose", preservedPaymentFilters.purpose);
  }

  if (preservedPaymentFilters.query) {
    url.searchParams.set("paymentQuery", preservedPaymentFilters.query);
  }

  url.searchParams.set("paymentLimit", String(preservedPaymentFilters.limit));

  if (preservedInvestigationFilters.status !== "all") {
    url.searchParams.set("investigationStatus", preservedInvestigationFilters.status);
  }

  if (preservedInvestigationFilters.caseType !== "all") {
    url.searchParams.set("investigationType", preservedInvestigationFilters.caseType);
  }

  if (preservedInvestigationFilters.priority !== "all") {
    url.searchParams.set("investigationPriority", preservedInvestigationFilters.priority);
  }

  if (preservedInvestigationFilters.query) {
    url.searchParams.set("investigationQuery", preservedInvestigationFilters.query);
  }

  url.searchParams.set("investigationLimit", String(preservedInvestigationFilters.limit));

  return `${url.pathname}${url.search}`;
}

export function AuditExplorer({
  explorer,
  preservedPaymentFilters,
  preservedInvestigationFilters,
}: AuditExplorerProps) {
  const exportHref = buildExportHref(explorer);
  const resetHref = buildResetHref(preservedPaymentFilters, preservedInvestigationFilters);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Support tooling</p>
          <h2 className="mt-2 font-[var(--font-display)] text-3xl">Audit explorer</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Search cross-product activity by entity type, actor role, action, or free text. This is the fastest way to trace listing reviews, unlocks, seeker actions, and payment decisions from one place.
          </p>
        </div>
        <Link
          href={exportHref}
          className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
        >
          Export CSV
        </Link>
      </div>

      <form method="get" action="/admin" className="grid gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)] md:grid-cols-2 xl:grid-cols-5">
        <input type="hidden" name="paymentStatus" value={preservedPaymentFilters.status} />
        <input type="hidden" name="paymentPurpose" value={preservedPaymentFilters.purpose} />
        <input type="hidden" name="paymentQuery" value={preservedPaymentFilters.query} />
        <input type="hidden" name="paymentLimit" value={String(preservedPaymentFilters.limit)} />
        <input type="hidden" name="investigationStatus" value={preservedInvestigationFilters.status} />
        <input type="hidden" name="investigationType" value={preservedInvestigationFilters.caseType} />
        <input type="hidden" name="investigationPriority" value={preservedInvestigationFilters.priority} />
        <input type="hidden" name="investigationQuery" value={preservedInvestigationFilters.query} />
        <input type="hidden" name="investigationLimit" value={String(preservedInvestigationFilters.limit)} />
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Entity type</span>
          <select
            name="entityType"
            defaultValue={explorer.filters.entityType}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          >
            <option value="all">All entities</option>
            {explorer.availableEntityTypes.map((entityType) => (
              <option key={entityType} value={entityType}>
                {humanizeEnum(entityType)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Actor role</span>
          <select
            name="actorRole"
            defaultValue={explorer.filters.actorRole}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          >
            <option value="all">All roles</option>
            {explorer.availableActorRoles.map((role) => (
              <option key={role} value={role}>
                {humanizeEnum(role)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Action</span>
          <input
            name="action"
            defaultValue={explorer.filters.action}
            list="audit-actions"
            placeholder="payment_status_updated"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          />
          <datalist id="audit-actions">
            {explorer.commonActions.map((action) => (
              <option key={action} value={action} />
            ))}
          </datalist>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Lookup</span>
          <input
            name="query"
            defaultValue={explorer.filters.query}
            placeholder="reference, title, entity id..."
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          />
        </label>

        <div className="space-y-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Limit</span>
            <select
              name="limit"
              defaultValue={String(explorer.filters.limit)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
            >
              {[24, 50, 100, 200].map((limit) => (
                <option key={limit} value={limit}>
                  {limit} rows
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
            >
              Apply filters
            </button>
            <Link
              href={resetHref}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition hover:bg-[var(--surface-alt)]"
            >
              Reset
            </Link>
          </div>
        </div>
      </form>

      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
        <p className="text-sm leading-6 text-[var(--muted)]">
          Showing {explorer.entries.length} of {explorer.totalCount} matching audit records.
        </p>
      </div>

      {explorer.entries.length === 0 ? (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          No audit records match the current filters.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {explorer.entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                    {humanizeEnum(entry.action)}
                  </p>
                  <h3 className="mt-2 font-semibold text-[var(--foreground)]">{humanizeEnum(entry.entityType)}</h3>
                </div>
                <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {formatDateTime(entry.createdAt)}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {entry.actorName}
                {entry.actorRole ? ` / ${humanizeEnum(entry.actorRole)}` : ""} / {entry.entityId}
              </p>
              <p className="mt-3 rounded-2xl bg-[var(--surface-alt)] px-3 py-2 text-sm leading-6 text-[var(--muted)]">
                {entry.metadataSummary ?? "No extra metadata recorded for this action."}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
