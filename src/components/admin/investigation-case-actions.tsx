"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  investigationCaseStatuses,
  investigationUpdateChannels,
  investigationUpdateOutcomes,
  investigationUpdateTargets,
  type InvestigationCaseStatus,
  type InvestigationUpdateChannel,
  type InvestigationUpdateOutcome,
  type InvestigationUpdateTarget,
} from "@/lib/domain";
import { humanizeEnum } from "@/lib/formatting/text";

type InvestigationCaseActionsProps = {
  caseId: string;
  currentStatus: InvestigationCaseStatus;
  canManage: boolean;
};

type InvestigationStatusResponse = {
  status: "ok" | "error";
  message?: string;
};

export function InvestigationCaseActions({
  caseId,
  currentStatus,
  canManage,
}: InvestigationCaseActionsProps) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<InvestigationCaseStatus>(currentStatus);
  const [target, setTarget] = useState<InvestigationUpdateTarget>("owner");
  const [channel, setChannel] = useState<InvestigationUpdateChannel>("phone");
  const [outcome, setOutcome] = useState<InvestigationUpdateOutcome>("needs_follow_up");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage) {
    return null;
  }

  function handleSubmit() {
    setFeedback(null);
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/admin/investigations/${encodeURIComponent(caseId)}/updates`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: nextStatus,
              target,
              channel,
              outcome,
              note,
            }),
          });
          const payload = (await response.json()) as InvestigationStatusResponse & { investigationStatus?: string };

          if (!response.ok || payload.status !== "ok") {
            throw new Error(payload.message ?? "Could not log the investigation follow-up.");
          }

          setNote("");
          setFeedback(
            nextStatus === currentStatus
              ? "Investigation follow-up logged."
              : `Investigation updated and moved to ${humanizeEnum(payload.investigationStatus ?? nextStatus)}.`,
          );
          router.refresh();
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Could not log the investigation follow-up.");
        }
      })();
    });
  }

  return (
    <div className="mt-4 space-y-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]">Verification follow-up</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Record who was contacted, how the check was performed, what the outcome was, and optionally move the case to a new status.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Case status</span>
          <select
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as InvestigationCaseStatus)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)]"
          >
            {investigationCaseStatuses.map((status) => (
              <option key={status} value={status}>
                {humanizeEnum(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Target</span>
          <select
            value={target}
            onChange={(event) => setTarget(event.target.value as InvestigationUpdateTarget)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)]"
          >
            {investigationUpdateTargets.map((value) => (
              <option key={value} value={value}>
                {humanizeEnum(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Method</span>
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value as InvestigationUpdateChannel)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)]"
          >
            {investigationUpdateChannels.map((value) => (
              <option key={value} value={value}>
                {humanizeEnum(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Outcome</span>
          <select
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as InvestigationUpdateOutcome)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)]"
          >
            {investigationUpdateOutcomes.map((value) => (
              <option key={value} value={value}>
                {humanizeEnum(value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Follow-up note</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Record what the owner, buyer, or provider said, what document was checked, or why the case needs escalation."
          className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)]"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${
            isPending
              ? "cursor-not-allowed border border-[var(--border)] bg-white/70 text-[var(--muted)]"
              : "bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]"
          }`}
        >
          {isPending ? "Saving..." : "Log follow-up"}
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
