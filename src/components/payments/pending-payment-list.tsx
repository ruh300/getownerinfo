import Link from "next/link";

import type { BuyerPaymentSummary } from "@/lib/dashboard/workspace";
import { formatRwf } from "@/lib/formatting/currency";
import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";

type PendingPaymentListProps = {
  payments: BuyerPaymentSummary[];
};

export function PendingPaymentList({ payments }: PendingPaymentListProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Payments in progress</p>
          <h2 className="mt-2 font-[var(--font-display)] text-3xl">Continue your pending checkouts</h2>
        </div>
        <Link
          href="/listings"
          className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:bg-[rgba(200,134,10,0.08)]"
        >
          Browse listings
        </Link>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-[24px] border border-[rgba(200,134,10,0.18)] bg-[linear-gradient(180deg,#fff9ef,#fff5e0)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(200,134,10,0.08)]">
          You do not have any active checkouts right now. If you start an unlock and leave before payment confirmation, it will reappear here until it expires or is cancelled.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {payments.map((payment) => (
            <article
              key={payment.id}
              className="rounded-[24px] border border-[rgba(200,134,10,0.18)] bg-[linear-gradient(180deg,#fff9ef,#fff5e0)] p-5 shadow-[0_12px_32px_rgba(200,134,10,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Pending checkout</p>
                  <h3 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--foreground)]">
                    {formatRwf(payment.amountRwf)}
                  </h3>
                </div>
                <div className="rounded-full border border-[rgba(200,134,10,0.2)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                  {humanizeEnum(payment.status)}
                </div>
              </div>

              <p className="mt-4 text-base font-semibold text-[var(--foreground)]">
                {payment.linkedLabel ?? "Linked item unavailable"}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                {humanizeEnum(payment.purpose)} / {payment.reference}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {payment.checkoutExpiresAt
                  ? `Complete before ${formatDateTime(payment.checkoutExpiresAt)}`
                  : `Created ${formatDateTime(payment.createdAt)}`}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {payment.checkoutPath ? (
                  <Link
                    href={payment.checkoutPath}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#a06b08]"
                  >
                    Continue checkout
                  </Link>
                ) : null}
                {payment.linkedPath ? (
                  <Link
                    href={payment.linkedPath}
                    className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:bg-[rgba(200,134,10,0.08)]"
                  >
                    Open listing
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
