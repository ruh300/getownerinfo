"use client";

import Link from "next/link";
import { useState } from "react";

import { formatRwf } from "@/lib/formatting/currency";
import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";
import type { PaymentCheckoutData } from "@/lib/payments/workflow";

type MockPaymentCheckoutProps = {
  checkout: PaymentCheckoutData;
};

type MockCompleteResponse = {
  status: "ok" | "error";
  message?: string;
  paymentStatus?: "pending" | "paid" | "failed" | "cancelled";
  redirectPath?: string;
};

export function MockPaymentCheckout({ checkout }: MockPaymentCheckoutProps) {
  const [status, setStatus] = useState(checkout.status);
  const [isSubmitting, setIsSubmitting] = useState<"paid" | "failed" | "cancelled" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(checkout.failureReason);

  async function handleComplete(outcome: "paid" | "failed" | "cancelled") {
    setNotice(null);
    setError(null);
    setIsSubmitting(outcome);

    try {
      const response = await fetch(`/api/payments/mock/${checkout.reference}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outcome,
        }),
      });
      const payload = (await response.json()) as MockCompleteResponse;

      if (!response.ok || payload.status !== "ok" || !payload.paymentStatus) {
        throw new Error(payload.message ?? "Could not complete the mock checkout.");
      }

      setStatus(payload.paymentStatus);
      setNotice(
        payload.paymentStatus === "paid"
          ? "Payment confirmed. Use the return link below to see the unlocked details."
          : payload.paymentStatus === "failed"
            ? "The payment was marked failed. You can return and try again."
            : "The payment was cancelled. You can return without unlocking access.",
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not complete the mock checkout.");
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <section className="rounded-[30px] border border-[rgba(26,77,46,0.14)] bg-[var(--surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Mock checkout</p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl leading-tight md:text-5xl">
            Confirm the payment before access is granted
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
          <p>{humanizeEnum(status)}</p>
          <p>{checkout.checkoutExpiresAt ? `Expires ${formatDateTime(checkout.checkoutExpiresAt)}` : `Created ${formatDateTime(checkout.createdAt)}`}</p>
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-6 text-[var(--muted)]">
        This hosted screen is still available as the local fallback checkout while the AfrIPay flow is being validated against live return payloads.
        The app now waits for a settled payment before applying unlock access.
      </p>

      {status === "pending" ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void handleComplete("paid");
            }}
            disabled={isSubmitting !== null}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
              isSubmitting !== null ? "cursor-not-allowed bg-[rgba(26,77,46,0.45)]" : "bg-[var(--primary)] hover:bg-[var(--primary-light)]"
            }`}
          >
            {isSubmitting === "paid" ? "Confirming..." : "Simulate successful payment"}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleComplete("failed");
            }}
            disabled={isSubmitting !== null}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] transition ${
              isSubmitting !== null
                ? "cursor-not-allowed border border-[var(--border)] text-[var(--muted)]"
                : "border border-[rgba(184,50,50,0.24)] text-[#9c2d2d] hover:bg-[rgba(184,50,50,0.08)]"
            }`}
          >
            {isSubmitting === "failed" ? "Failing..." : "Simulate failure"}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleComplete("cancelled");
            }}
            disabled={isSubmitting !== null}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] transition ${
              isSubmitting !== null
                ? "cursor-not-allowed border border-[var(--border)] text-[var(--muted)]"
                : "border border-[var(--accent)] text-[var(--accent)] hover:bg-[rgba(200,134,10,0.08)]"
            }`}
          >
            {isSubmitting === "cancelled" ? "Cancelling..." : "Cancel payment"}
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="mt-5 rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm leading-6 text-[var(--primary)]">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm leading-6 text-[#9c2d2d]">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={checkout.returnPath}
          className="rounded-full border border-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
        >
          {status === "paid" ? "Return to unlocked item" : "Return without unlock"}
        </Link>
      </div>
    </section>
  );
}
