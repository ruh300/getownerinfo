"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { PenaltyDocument } from "@/lib/domain";

type PenaltyCaseActionsProps = {
  penaltyId: string;
  currentStatus: PenaltyDocument["status"];
  currentAmountRwf: number;
  canManage: boolean;
};

type PenaltyDecisionResponse = {
  status: "ok" | "error";
  message?: string;
};

export function PenaltyCaseActions({
  penaltyId,
  currentStatus,
  currentAmountRwf,
  canManage,
}: PenaltyCaseActionsProps) {
  const router = useRouter();
  const [statusNote, setStatusNote] = useState("");
  const [adjustedAmountRwf, setAdjustedAmountRwf] = useState(String(currentAmountRwf));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage) {
    return null;
  }

  if (currentStatus !== "due") {
    return (
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        This penalty is already {currentStatus}.
      </div>
    );
  }

  function handleDecision(nextStatus: Extract<PenaltyDocument["status"], "paid" | "waived">) {
    setFeedback(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/admin/penalties/${encodeURIComponent(penaltyId)}/status`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: nextStatus,
              statusNote,
            }),
          });
          const payload = (await response.json()) as PenaltyDecisionResponse;

          if (!response.ok || payload.status !== "ok") {
            throw new Error(payload.message ?? "Could not update the penalty.");
          }

          setFeedback(nextStatus === "paid" ? "Penalty marked as paid." : "Penalty waived.");
          router.refresh();
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Could not update the penalty.");
        }
      })();
    });
  }

  function handleAdjustAmount() {
    setFeedback(null);
    setError(null);

    const penaltyAmountRwf = Number.parseInt(adjustedAmountRwf, 10);

    if (!Number.isInteger(penaltyAmountRwf) || penaltyAmountRwf <= 0) {
      setError("Enter a valid adjusted amount in Rwf.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/admin/penalties/${encodeURIComponent(penaltyId)}/amount`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              penaltyAmountRwf,
              statusNote,
            }),
          });
          const payload = (await response.json()) as PenaltyDecisionResponse;

          if (!response.ok || payload.status !== "ok") {
            throw new Error(payload.message ?? "Could not adjust the penalty.");
          }

          setFeedback("Penalty amount updated.");
          router.refresh();
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Could not adjust the penalty.");
        }
      })();
    });
  }

  return (
    <div className="mt-4 space-y-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]">Penalty decision</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Confirm settlement after reconciliation, or waive the penalty if the admin team approves an exception.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Adjusted amount</span>
        <input
          type="number"
          min="1"
          value={adjustedAmountRwf}
          onChange={(event) => setAdjustedAmountRwf(event.target.value)}
          className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)]"
          placeholder="Penalty amount in Rwf"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Admin note</span>
        <textarea
          value={statusNote}
          onChange={(event) => setStatusNote(event.target.value)}
          rows={3}
          placeholder="Optional note for the owner and support history."
          className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)]"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleAdjustAmount}
          disabled={isPending}
          className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${
            isPending
              ? "cursor-not-allowed border border-[var(--border)] bg-white/70 text-[var(--muted)]"
              : "border border-[var(--accent)] text-[var(--accent)] hover:bg-[rgba(200,134,10,0.08)]"
          }`}
        >
          {isPending ? "Saving..." : "Adjust amount"}
        </button>
        <button
          type="button"
          onClick={() => handleDecision("paid")}
          disabled={isPending}
          className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${
            isPending
              ? "cursor-not-allowed border border-[var(--border)] bg-white/70 text-[var(--muted)]"
              : "bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]"
          }`}
        >
          {isPending ? "Saving..." : "Mark paid"}
        </button>
        <button
          type="button"
          onClick={() => handleDecision("waived")}
          disabled={isPending}
          className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${
            isPending
              ? "cursor-not-allowed border border-[var(--border)] bg-white/70 text-[var(--muted)]"
              : "border border-[rgba(184,50,50,0.2)] text-[#9c2d2d] hover:bg-[rgba(184,50,50,0.08)]"
          }`}
        >
          {isPending ? "Saving..." : "Waive"}
        </button>
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
