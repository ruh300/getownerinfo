import Link from "next/link";

import { InvestigationCaseActions } from "@/components/admin/investigation-case-actions";
import type { AdminAuditExplorerFilters } from "@/lib/admin/audit-explorer";
import type { AdminPaymentExplorerFilters } from "@/lib/admin/payment-explorer";
import type { AdminInvestigationOverviewData } from "@/lib/investigations/workflow";
import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";

type InvestigationOverviewProps = {
  overview: AdminInvestigationOverviewData;
  canManage: boolean;
  preservedAuditFilters: AdminAuditExplorerFilters;
  preservedPaymentFilters: AdminPaymentExplorerFilters;
};

function buildExportHref(overview: AdminInvestigationOverviewData) {
  const url = new URL("https://getownerinfo.local/api/admin/investigations/export");

  if (overview.filters.status !== "all") {
    url.searchParams.set("investigationStatus", overview.filters.status);
  }

  if (overview.filters.caseType !== "all") {
    url.searchParams.set("investigationType", overview.filters.caseType);
  }

  if (overview.filters.priority !== "all") {
    url.searchParams.set("investigationPriority", overview.filters.priority);
  }

  if (overview.filters.query) {
    url.searchParams.set("investigationQuery", overview.filters.query);
  }

  url.searchParams.set("investigationLimit", String(overview.filters.limit));

  return `${url.pathname}${url.search}`;
}

function buildResetHref(
  preservedAuditFilters: AdminAuditExplorerFilters,
  preservedPaymentFilters: AdminPaymentExplorerFilters,
) {
  const url = new URL("https://getownerinfo.local/admin");

  if (preservedAuditFilters.entityType !== "all") {
    url.searchParams.set("entityType", preservedAuditFilters.entityType);
  }

  if (preservedAuditFilters.actorRole !== "all") {
    url.searchParams.set("actorRole", preservedAuditFilters.actorRole);
  }

  if (preservedAuditFilters.action) {
    url.searchParams.set("action", preservedAuditFilters.action);
  }

  if (preservedAuditFilters.query) {
    url.searchParams.set("query", preservedAuditFilters.query);
  }

  url.searchParams.set("limit", String(preservedAuditFilters.limit));

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

  return `${url.pathname}${url.search}`;
}

function getStatusBadgeClassName(status: string) {
  switch (status) {
    case "investigating":
      return "border-[rgba(200,134,10,0.18)] bg-[rgba(200,134,10,0.08)] text-[var(--accent)]";
    case "resolved":
      return "border-[rgba(26,122,74,0.18)] bg-[rgba(26,122,74,0.08)] text-[var(--primary)]";
    case "dismissed":
      return "border-[rgba(84,92,108,0.18)] bg-[rgba(84,92,108,0.08)] text-[#4b5563]";
    default:
      return "border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] text-[#9c2d2d]";
  }
}

function getPriorityBadgeClassName(priority: string) {
  switch (priority) {
    case "urgent":
      return "border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] text-[#9c2d2d]";
    case "high":
      return "border-[rgba(200,134,10,0.18)] bg-[rgba(200,134,10,0.08)] text-[var(--accent)]";
    case "medium":
      return "border-[rgba(26,77,46,0.14)] bg-[rgba(26,77,46,0.06)] text-[var(--primary)]";
    default:
      return "border-[var(--border)] bg-[var(--surface-alt)] text-[var(--muted)]";
  }
}

export function InvestigationOverview({
  overview,
  canManage,
  preservedAuditFilters,
  preservedPaymentFilters,
}: InvestigationOverviewProps) {
  const exportHref = buildExportHref(overview);
  const resetHref = buildResetHref(preservedAuditFilters, preservedPaymentFilters);

  return (
    <section id="investigations" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Investigation queue</p>
          <h2 className="mt-2 font-[var(--font-display)] text-3xl">Verification and dispute cases</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Track suspicious activity, deal-verification follow-up, document reviews, and payment disputes from one internal case queue.
          </p>
        </div>
        <Link
          href={exportHref}
          className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
        >
          Export CSV
        </Link>
      </div>

      <form
        method="get"
        action="/admin"
        className="grid gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)] md:grid-cols-2 xl:grid-cols-5"
      >
        <input type="hidden" name="entityType" value={preservedAuditFilters.entityType} />
        <input type="hidden" name="actorRole" value={preservedAuditFilters.actorRole} />
        <input type="hidden" name="action" value={preservedAuditFilters.action} />
        <input type="hidden" name="query" value={preservedAuditFilters.query} />
        <input type="hidden" name="limit" value={String(preservedAuditFilters.limit)} />
        <input type="hidden" name="paymentStatus" value={preservedPaymentFilters.status} />
        <input type="hidden" name="paymentPurpose" value={preservedPaymentFilters.purpose} />
        <input type="hidden" name="paymentQuery" value={preservedPaymentFilters.query} />
        <input type="hidden" name="paymentLimit" value={String(preservedPaymentFilters.limit)} />

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Status</span>
          <select
            name="investigationStatus"
            defaultValue={overview.filters.status}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          >
            <option value="all">All statuses</option>
            {overview.availableStatuses.map((status) => (
              <option key={status} value={status}>
                {humanizeEnum(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Case type</span>
          <select
            name="investigationType"
            defaultValue={overview.filters.caseType}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          >
            <option value="all">All case types</option>
            {overview.availableCaseTypes.map((caseType) => (
              <option key={caseType} value={caseType}>
                {humanizeEnum(caseType)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Priority</span>
          <select
            name="investigationPriority"
            defaultValue={overview.filters.priority}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          >
            <option value="all">All priorities</option>
            {overview.availablePriorities.map((priority) => (
              <option key={priority} value={priority}>
                {humanizeEnum(priority)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Lookup</span>
          <input
            name="investigationQuery"
            defaultValue={overview.filters.query}
            placeholder="title, entity id, subject..."
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          />
        </label>

        <div className="space-y-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Limit</span>
            <select
              name="investigationLimit"
              defaultValue={String(overview.filters.limit)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
            >
              {[12, 24, 50, 100].map((limit) => (
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
          Showing {overview.cases.length} of {overview.totalCount} matching investigation cases.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-4">
        <article className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.05)] p-6 shadow-[0_12px_32px_rgba(184,50,50,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9c2d2d]">Open</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.openCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Cases newly opened and awaiting assignment.</p>
        </article>
        <article className="rounded-[24px] border border-[rgba(200,134,10,0.18)] bg-[linear-gradient(180deg,#fff9ef,#fff5e0)] p-6 shadow-[0_12px_32px_rgba(200,134,10,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Investigating</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.investigatingCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Cases actively being checked by admin or manager staff.</p>
        </article>
        <article className="rounded-[24px] border border-[rgba(26,122,74,0.18)] bg-[rgba(26,122,74,0.08)] p-6 shadow-[0_12px_32px_rgba(26,122,74,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Resolved</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.resolvedCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Cases closed with a documented outcome.</p>
        </article>
        <article className="rounded-[24px] border border-[rgba(84,92,108,0.18)] bg-[rgba(84,92,108,0.04)] p-6 shadow-[0_12px_32px_rgba(84,92,108,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#4b5563]">Dismissed</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.dismissedCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Cases closed without platform action.</p>
        </article>
      </section>

      {overview.cases.length === 0 ? (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          No investigation cases exist yet. Open one from a listing review card, commission case, penalty case, or payment support workflow.
        </div>
      ) : (
        <div className="grid gap-4">
          {overview.cases.map((investigationCase) => (
            <article
              key={investigationCase.id}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                    {humanizeEnum(investigationCase.caseType)} / {humanizeEnum(investigationCase.entityType)}
                  </p>
                  <h3 className="mt-2 font-[var(--font-display)] text-2xl">{investigationCase.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Subject: {investigationCase.subjectName ?? "Internal case"}
                    {investigationCase.subjectRole ? ` (${humanizeEnum(investigationCase.subjectRole)})` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${getPriorityBadgeClassName(investigationCase.priority)}`}
                  >
                    {humanizeEnum(investigationCase.priority)}
                  </div>
                  <div
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusBadgeClassName(investigationCase.status)}`}
                  >
                    {humanizeEnum(investigationCase.status)}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Summary</p>
                  <p>{investigationCase.summary}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Opened by</p>
                  <p>{investigationCase.openedByName}</p>
                  <p>{investigationCase.openedByRole ? humanizeEnum(investigationCase.openedByRole) : "Role unavailable"}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Last update</p>
                  <p>{investigationCase.updatedByName}</p>
                  <p>{formatDateTime(investigationCase.updatedAt)}</p>
                  {investigationCase.relatedHref && investigationCase.relatedLabel ? (
                    <Link
                      href={investigationCase.relatedHref}
                      className="mt-2 inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:text-[var(--primary-light)]"
                    >
                      {investigationCase.relatedLabel}
                    </Link>
                  ) : null}
                </div>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Resolution note</p>
                  <p>{investigationCase.resolutionNote ?? "No resolution note yet."}</p>
                  <p>{investigationCase.resolvedAt ? `Closed ${formatDateTime(investigationCase.resolvedAt)}` : `Created ${formatDateTime(investigationCase.createdAt)}`}</p>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Verification timeline</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Structured support notes for calls, document checks, provider reviews, and outcome confirmation.
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    {investigationCase.updateCount} log{investigationCase.updateCount === 1 ? "" : "s"}
                  </span>
                </div>

                {investigationCase.recentUpdates.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                    No verification follow-up has been recorded yet.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {investigationCase.recentUpdates.map((update) => (
                      <article
                        key={update.id}
                        className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[var(--foreground)]">
                              {humanizeEnum(update.target)} via {humanizeEnum(update.channel)}
                            </p>
                            <p className="text-xs uppercase tracking-[0.12em] text-[var(--primary-light)]">
                              {humanizeEnum(update.outcome)} / case {humanizeEnum(update.caseStatusAfter)}
                            </p>
                          </div>
                          <div className="text-right text-xs uppercase tracking-[0.12em] text-[var(--primary-light)]">
                            <p>{update.authorName}</p>
                            <p>{formatDateTime(update.createdAt)}</p>
                          </div>
                        </div>
                        <p className="mt-2">{update.note}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <InvestigationCaseActions
                caseId={investigationCase.id}
                currentStatus={investigationCase.status}
                canManage={canManage}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
