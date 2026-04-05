import Link from "next/link";

import { InvestigationCaseLauncher } from "@/components/admin/investigation-case-launcher";
import { PaymentReviewActions } from "@/components/admin/payment-review-actions";
import type { AdminAuditExplorerFilters } from "@/lib/admin/audit-explorer";
import type { AdminPaymentExplorerData } from "@/lib/admin/payment-explorer";
import type { AdminInvestigationExplorerFilters } from "@/lib/investigations/workflow";
import { formatRwf } from "@/lib/formatting/currency";
import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";

type PaymentOverviewProps = {
  overview: AdminPaymentExplorerData;
  canManagePayments: boolean;
  canOpenInvestigations: boolean;
  preservedAuditFilters: AdminAuditExplorerFilters;
  preservedInvestigationFilters: AdminInvestigationExplorerFilters;
};

function getPaymentStatusBadgeClass(status: "pending" | "paid" | "failed" | "cancelled" | null) {
  if (status === "paid") {
    return "border-[rgba(26,122,74,0.18)] bg-[rgba(26,122,74,0.08)] text-[var(--primary)]";
  }

  if (status === "pending") {
    return "border-[rgba(200,134,10,0.2)] bg-[rgba(200,134,10,0.08)] text-[var(--accent)]";
  }

  if (status === "cancelled") {
    return "border-[rgba(84,92,108,0.2)] bg-[rgba(84,92,108,0.08)] text-[#4b5563]";
  }

  return "border-[rgba(184,50,50,0.18)] bg-[rgba(184,50,50,0.08)] text-[#9c2d2d]";
}

function buildExportHref(overview: AdminPaymentExplorerData) {
  const url = new URL("https://getownerinfo.local/api/admin/payments/export");

  if (overview.filters.status !== "all") {
    url.searchParams.set("paymentStatus", overview.filters.status);
  }

  if (overview.filters.purpose !== "all") {
    url.searchParams.set("paymentPurpose", overview.filters.purpose);
  }

  if (overview.filters.query) {
    url.searchParams.set("paymentQuery", overview.filters.query);
  }

  url.searchParams.set("paymentLimit", String(overview.filters.limit));

  return `${url.pathname}${url.search}`;
}

function buildResetHref(
  preservedAuditFilters: AdminAuditExplorerFilters,
  preservedInvestigationFilters: AdminInvestigationExplorerFilters,
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

export function PaymentOverview({
  overview,
  canManagePayments,
  canOpenInvestigations,
  preservedAuditFilters,
  preservedInvestigationFilters,
}: PaymentOverviewProps) {
  const exportHref = buildExportHref(overview);
  const resetHref = buildResetHref(preservedAuditFilters, preservedInvestigationFilters);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Payments</p>
          <h2 className="mt-2 font-[var(--font-display)] text-3xl">Payment explorer</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Filter live payment records by status, purpose, or free text, then export the matching ledger for support, reconciliation, or dispute follow-up.
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
        <input type="hidden" name="investigationStatus" value={preservedInvestigationFilters.status} />
        <input type="hidden" name="investigationType" value={preservedInvestigationFilters.caseType} />
        <input type="hidden" name="investigationPriority" value={preservedInvestigationFilters.priority} />
        <input type="hidden" name="investigationQuery" value={preservedInvestigationFilters.query} />
        <input type="hidden" name="investigationLimit" value={String(preservedInvestigationFilters.limit)} />

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Status</span>
          <select
            name="paymentStatus"
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
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Purpose</span>
          <select
            name="paymentPurpose"
            defaultValue={overview.filters.purpose}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          >
            <option value="all">All purposes</option>
            {overview.availablePurposes.map((purpose) => (
              <option key={purpose} value={purpose}>
                {humanizeEnum(purpose)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Lookup</span>
          <input
            name="paymentQuery"
            defaultValue={overview.filters.query}
            placeholder="reference, user, linked entity..."
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Limit</span>
          <select
            name="paymentLimit"
            defaultValue={String(overview.filters.limit)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          >
            {[24, 50, 100, 200].map((limit) => (
              <option key={limit} value={limit}>
                {limit} rows
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Apply</div>
          <div className="flex flex-wrap gap-3 pt-2">
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
          Showing {overview.payments.length} of {overview.totalCount} matching payment records.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Paid total</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{formatRwf(overview.stats.totalPaidRwf)}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Paid value inside the current filter scope.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Paid count</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.paidCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Matching records already settled as paid.</p>
        </article>
        <article className="rounded-[24px] border border-[rgba(200,134,10,0.18)] bg-[linear-gradient(180deg,#fff9ef,#fff5e0)] p-6 shadow-[0_12px_32px_rgba(200,134,10,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Pending</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.pendingCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Checkout intents still waiting for confirmation.</p>
        </article>
        <article className="rounded-[24px] border border-[rgba(184,50,50,0.18)] bg-[rgba(184,50,50,0.05)] p-6 shadow-[0_12px_32px_rgba(184,50,50,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9c2d2d]">Failed / Cancelled</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">
            {overview.stats.failedCount + overview.stats.cancelledCount}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Payments that did not settle successfully.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Listing revenue</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{formatRwf(overview.stats.listingRevenueRwf)}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Listing fees, unlock fees, commissions, and penalties.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Seeker revenue</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{formatRwf(overview.stats.seekerRevenueRwf)}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Posting fees and seeker contact unlocks.</p>
        </article>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Filtered ledger</p>
          <h3 className="mt-2 font-[var(--font-display)] text-3xl">Matching payment records</h3>
        </div>

        {overview.payments.length === 0 ? (
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
            No payment records match the current filters.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {overview.payments.map((payment) => (
              <article
                key={payment.id}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                      {humanizeEnum(payment.purpose)}
                    </p>
                    <h4 className="mt-2 font-semibold text-[var(--foreground)]">{formatRwf(payment.amountRwf)}</h4>
                  </div>
                  <div
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getPaymentStatusBadgeClass(payment.status)}`}
                  >
                    {humanizeEnum(payment.status)}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {payment.userName}
                  {payment.userRole ? ` / ${humanizeEnum(payment.userRole)}` : ""}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{payment.reference}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {payment.linkedEntityLabel ?? "No linked entity"}
                </p>
                {payment.providerReference || payment.providerTransactionId ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {payment.providerReference ?? "No provider ref"}
                    {payment.providerTransactionId ? ` / ${payment.providerTransactionId}` : ""}
                  </p>
                ) : null}
                <p className="mt-3 rounded-2xl bg-[var(--surface-alt)] px-3 py-2 text-sm leading-6 text-[var(--muted)]">
                  {payment.metadataSummary ?? "No metadata recorded."}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Created {formatDateTime(payment.createdAt)}</p>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  {payment.settledAt
                    ? `Settled ${formatDateTime(payment.settledAt)}`
                    : payment.status === "cancelled"
                      ? "Checkout was cancelled before settlement"
                      : payment.status === "failed"
                        ? payment.failureReason ?? "Payment failed before settlement"
                        : "Not settled yet"}
                </p>
                {payment.lastProviderStatus ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Provider status: {payment.lastProviderStatus}
                  </p>
                ) : null}
                <PaymentReviewActions
                  reference={payment.reference}
                  currentStatus={payment.status}
                  canManagePayments={canManagePayments}
                />
                <InvestigationCaseLauncher
                  entityType="payment"
                  entityId={payment.reference}
                  defaultCaseType="payment_dispute"
                  canManage={canOpenInvestigations}
                  label="Open payment investigation"
                />
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Filtered transitions</p>
          <h3 className="mt-2 font-[var(--font-display)] text-3xl">Recent matching payment events</h3>
        </div>

        {overview.events.length === 0 ? (
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
            No payment transition events match the current filters.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {overview.events.map((event) => (
              <article
                key={event.id}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                      {humanizeEnum(event.action)}
                    </p>
                    <h4 className="mt-2 font-semibold text-[var(--foreground)]">
                      {event.purpose ? humanizeEnum(event.purpose) : "Payment event"}
                    </h4>
                  </div>
                  <div
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getPaymentStatusBadgeClass(event.nextStatus ?? event.currentStatus)}`}
                  >
                    {humanizeEnum(event.nextStatus ?? event.currentStatus ?? "unknown")}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {event.actorName}
                  {event.actorRole ? ` / ${humanizeEnum(event.actorRole)}` : ""}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {event.reference ?? "No payment reference"}
                  {event.amountRwf !== null ? ` / ${formatRwf(event.amountRwf)}` : ""}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {event.previousStatus && event.nextStatus
                    ? `${humanizeEnum(event.previousStatus)} -> ${humanizeEnum(event.nextStatus)}`
                    : event.currentStatus
                      ? `Current status: ${humanizeEnum(event.currentStatus)}`
                      : "Status not recorded"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {event.linkedEntityLabel ?? "No linked entity"}
                  {event.source ? ` / Source: ${humanizeEnum(event.source)}` : ""}
                </p>
                {event.lastProviderStatus ? (
                  <p className="mt-2 rounded-2xl bg-[var(--surface-alt)] px-3 py-2 text-sm leading-6 text-[var(--muted)]">
                    Provider status: {event.lastProviderStatus}
                    {event.failureReason ? ` / ${event.failureReason}` : ""}
                  </p>
                ) : event.failureReason ? (
                  <p className="mt-2 rounded-2xl bg-[var(--surface-alt)] px-3 py-2 text-sm leading-6 text-[var(--muted)]">
                    {event.failureReason}
                  </p>
                ) : null}
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Recorded {formatDateTime(event.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
