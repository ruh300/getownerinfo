"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { CommissionCaseDocument } from "@/lib/domain";

type CommissionCaseActionsProps = {
  commissionCaseId: string;
  currentStatus: CommissionCaseDocument["status"];
  canManage: boolean;
};

type CommissionDecisionResponse = {
  status: "ok" | "error";
  message?: string;
};

export function CommissionCaseActions({
  commissionCaseId,
  currentStatus,
  canManage,
}: CommissionCaseActionsProps) {
  const router = useRouter();
  const [statusNote, setStatusNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage) {
    return null;
  }

  if (currentStatus !== "due") {
    return (
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        This commission case is already {currentStatus}.
      </div>
    );
  }

  function handleDecision(nextStatus: Extract<CommissionCaseDocument["status"], "paid" | "waived">) {
    setFeedback(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/admin/commissions/${encodeURIComponent(commissionCaseId)}/status`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: nextStatus,
              statusNote,
            }),
          });
          const payload = (await response.json()) as CommissionDecisionResponse;

          if (!response.ok || payload.status !== "ok") {
            throw new Error(payload.message ?? "Could not update the commission case.");
          }

          setFeedback(nextStatus === "paid" ? "Commission marked as paid." : "Commission case waived.");
          router.refresh();
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Could not update the commission case.");
        }
      })();
    });
  }

  return (
    <div className="mt-4 space-y-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]">Commission decision</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Confirm payment after offline reconciliation, or waive the case if the admin team approves an exception.
        </p>
      </div>

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
