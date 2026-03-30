"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { PaymentStatus } from "@/lib/domain";

type PaymentReviewActionsProps = {
  reference: string;
  currentStatus: PaymentStatus;
  canManagePayments: boolean;
};

type ManualPaymentReviewResponse = {
  status: "ok" | "error";
  message?: string;
  paymentStatus?: PaymentStatus;
};

const reviewActions: Array<{
  status: Extract<PaymentStatus, "paid" | "failed" | "cancelled">;
  label: string;
  buttonClassName: string;
}> = [
  {
    status: "paid",
    label: "Mark paid",
    buttonClassName: "bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]",
  },
  {
    status: "failed",
    label: "Mark failed",
    buttonClassName: "border border-[rgba(184,50,50,0.2)] text-[#9c2d2d] hover:bg-[rgba(184,50,50,0.08)]",
  },
  {
    status: "cancelled",
    label: "Cancel",
    buttonClassName: "border border-[rgba(84,92,108,0.2)] text-[#4b5563] hover:bg-[rgba(84,92,108,0.08)]",
  },
];

export function PaymentReviewActions({
  reference,
  currentStatus,
  canManagePayments,
}: PaymentReviewActionsProps) {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManagePayments) {
    return null;
  }

  if (currentStatus === "paid") {
    return (
      <div className="mt-4 rounded-2xl border border-[rgba(26,122,74,0.18)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm leading-6 text-[var(--primary)]">
        This payment is already settled. Reversal is intentionally blocked from the admin UI.
      </div>
    );
  }

  function handleDecision(nextStatus: Extract<PaymentStatus, "paid" | "failed" | "cancelled">) {
    setFeedback(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/admin/payments/${encodeURIComponent(reference)}/status`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: nextStatus,
              reviewNote,
            }),
          });
          const payload = (await response.json()) as ManualPaymentReviewResponse;

          if (!response.ok || payload.status !== "ok") {
            throw new Error(payload.message ?? "Could not apply the manual payment decision.");
          }

          setFeedback(`Payment marked as ${nextStatus}.`);
          router.refresh();
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Could not apply the manual payment decision.");
        }
      })();
    });
  }

  return (
    <div className="mt-4 space-y-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]">Manual review</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Use this when Afripay returns without a final status and you need to reconcile the payment manually.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Review note</span>
        <textarea
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={3}
          placeholder="Optional note about the manual confirmation."
          className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)]"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        {reviewActions.map((action) => (
          <button
            key={action.status}
            type="button"
            onClick={() => {
              void handleDecision(action.status);
            }}
            disabled={isPending || currentStatus === action.status}
            className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${
              isPending || currentStatus === action.status
                ? "cursor-not-allowed border border-[var(--border)] bg-white/70 text-[var(--muted)]"
                : action.buttonClassName
            }`}
          >
            {isPending && currentStatus !== action.status ? "Saving..." : action.label}
          </button>
        ))}
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-[rgba(26,122,74,0.18)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm leading-6 text-[var(--primary)]">
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm leading-6 text-[#9c2d2d]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
