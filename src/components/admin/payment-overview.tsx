import { formatRwf } from "@/lib/formatting/currency";
import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";
import type { AdminPaymentOverviewData } from "@/lib/payments/workflow";

type PaymentOverviewProps = {
  overview: AdminPaymentOverviewData;
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

export function PaymentOverview({ overview }: PaymentOverviewProps) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Payments</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl">Recorded payment activity</h2>
      </div>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Paid total</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{formatRwf(overview.stats.totalPaidRwf)}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Total value from recorded paid events.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Paid count</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.paidCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Payment records already settled as paid.</p>
        </article>
        <article className="rounded-[24px] border border-[rgba(200,134,10,0.18)] bg-[linear-gradient(180deg,#fff9ef,#fff5e0)] p-6 shadow-[0_12px_32px_rgba(200,134,10,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Pending</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.pendingCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Checkout intents waiting for confirmation or webhook settlement.</p>
        </article>
        <article className="rounded-[24px] border border-[rgba(184,50,50,0.18)] bg-[rgba(184,50,50,0.05)] p-6 shadow-[0_12px_32px_rgba(184,50,50,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9c2d2d]">Failed</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.failedCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Failed or rejected payments that may need a new checkout attempt.</p>
        </article>
        <article className="rounded-[24px] border border-[rgba(84,92,108,0.2)] bg-[rgba(84,92,108,0.04)] p-6 shadow-[0_12px_32px_rgba(84,92,108,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#4b5563]">Cancelled</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.cancelledCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Expired or abandoned checkouts that did not settle.</p>
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
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Recent ledger</p>
          <h3 className="mt-2 font-[var(--font-display)] text-3xl">Latest payment records</h3>
        </div>

        {overview.recentPayments.length === 0 ? (
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
            No payments have been recorded yet.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {overview.recentPayments.map((payment) => (
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
                        ? "Payment failed before settlement"
                        : "Not settled yet"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Provider transitions</p>
          <h3 className="mt-2 font-[var(--font-display)] text-3xl">Recent payment state changes</h3>
        </div>

        {overview.recentEvents.length === 0 ? (
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
            No payment transition events have been recorded yet.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {overview.recentEvents.map((event) => (
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
                  {event.reference ?? "No payment reference"} {event.amountRwf !== null ? `· ${formatRwf(event.amountRwf)}` : ""}
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
