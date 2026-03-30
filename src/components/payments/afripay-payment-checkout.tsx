"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { formatRwf } from "@/lib/formatting/currency";
import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";
import type { PaymentCheckoutData } from "@/lib/payments/workflow";

type AfripayPaymentCheckoutProps = {
  checkout: PaymentCheckoutData;
};

export function AfripayPaymentCheckout({ checkout }: AfripayPaymentCheckoutProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (checkout.status !== "pending" || !checkout.afripayCheckout || hasSubmitted) {
      return;
    }

    const timer = window.setTimeout(() => {
      formRef.current?.requestSubmit();
      setHasSubmitted(true);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [checkout.afripayCheckout, checkout.status, hasSubmitted]);

  if (!checkout.afripayCheckout) {
    return (
      <section className="rounded-[30px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] p-6 shadow-[0_24px_80px_rgba(184,50,50,0.08)] md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9c2d2d]">Afripay checkout unavailable</p>
        <h1 className="mt-3 font-[var(--font-display)] text-4xl leading-tight text-[var(--foreground)] md:text-5xl">
          The gateway handoff could not be prepared
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          This payment intent is configured for Afripay, but the hosted handoff data is missing. Return to the linked item and start a fresh attempt.
        </p>
        <div className="mt-6">
          <Link
            href={checkout.returnPath}
            className="rounded-full border border-[#9c2d2d] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#9c2d2d] transition hover:bg-[rgba(184,50,50,0.08)]"
          >
            Return to the linked item
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[30px] border border-[rgba(26,77,46,0.14)] bg-[var(--surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Afripay checkout</p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl leading-tight md:text-5xl">
            Redirecting you to the payment gateway
          </h1>
        </div>
        <div className="rounded-[24px] border border-[rgba(26,77,46,0.14)] bg-[var(--surface-alt)] px-5 py-4 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Amount due</p>
          <p className="mt-2 font-[var(--font-display)] text-3xl text-[var(--primary)]">{formatRwf(checkout.amountRwf)}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{humanizeEnum(checkout.purpose)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Reference</p>
          <p>{checkout.reference}</p>
        </div>
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Linked item</p>
          <p>{checkout.paymentLabel ?? checkout.linkedEntityLabel ?? "No linked item"}</p>
        </div>
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Checkout state</p>
          <p>{humanizeEnum(checkout.status)}</p>
          <p>{checkout.checkoutExpiresAt ? `Expires ${formatDateTime(checkout.checkoutExpiresAt)}` : `Created ${formatDateTime(checkout.createdAt)}`}</p>
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-6 text-[var(--muted)]">
        This handoff uses the legacy Afripay form-post contract from the old application. If the gateway returns with a final status, the unlock will settle automatically.
        If Afripay returns without one, the payment stays pending for manual review instead of unlocking incorrectly.
      </p>

      <form ref={formRef} action={checkout.afripayCheckout.actionUrl} method={checkout.afripayCheckout.method} className="mt-6">
        {Object.entries(checkout.afripayCheckout.fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
          >
            {hasSubmitted ? "Open Afripay again" : "Continue to Afripay"}
          </button>
          <Link
            href={checkout.returnPath}
            className="rounded-full border border-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
          >
            Return to the linked item
          </Link>
        </div>
      </form>
    </section>
  );
}
