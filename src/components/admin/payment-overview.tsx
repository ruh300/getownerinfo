import { formatRwf } from "@/lib/formatting/currency";
import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";
import type { AdminPaymentOverviewData } from "@/lib/payments/workflow";

type PaymentOverviewProps = {
  overview: AdminPaymentOverviewData;
};

export function PaymentOverview({ overview }: PaymentOverviewProps) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Payments</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl">Recorded payment activity</h2>
      </div>

      <section className="grid gap-6 md:grid-cols-3 xl:grid-cols-6">
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
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Pending</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.pendingCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Reserved for future AfrIPay checkout states.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Failed</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.failedCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Ready for retries and reconciliation later.</p>
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
                  <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
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
                  {payment.settledAt ? `Settled ${formatDateTime(payment.settledAt)}` : "Not settled yet"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
