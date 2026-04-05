"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  investigationCasePriorities,
  investigationCaseTypes,
  type InvestigationCasePriority,
  type InvestigationCaseType,
  type InvestigationCaseDocument,
} from "@/lib/domain";
import { humanizeEnum } from "@/lib/formatting/text";

type InvestigationCaseLauncherProps = {
  entityType: InvestigationCaseDocument["entityType"];
  entityId: string;
  defaultCaseType: InvestigationCaseType;
  canManage: boolean;
  label?: string;
};

type InvestigationResponse = {
  status: "ok" | "error";
  message?: string;
  created?: boolean;
};

export function InvestigationCaseLauncher({
  entityType,
  entityId,
  defaultCaseType,
  canManage,
  label = "Open investigation",
}: InvestigationCaseLauncherProps) {
  const router = useRouter();
  const [caseType, setCaseType] = useState<InvestigationCaseType>(defaultCaseType);
  const [priority, setPriority] = useState<InvestigationCasePriority>("medium");
  const [summary, setSummary] = useState("");
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
          const response = await fetch("/api/admin/investigations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              entityType,
              entityId,
              caseType,
              priority,
              summary,
            }),
          });
          const payload = (await response.json()) as InvestigationResponse;

          if (!response.ok || payload.status !== "ok") {
            throw new Error(payload.message ?? "Could not open the investigation case.");
          }

          setSummary("");
          setFeedback(payload.created === false ? "An active investigation already exists for this item." : "Investigation case opened.");
          router.refresh();
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Could not open the investigation case.");
        }
      })();
    });
  }

  return (
    <div className="mt-4 space-y-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]">{label}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Create a tracked internal case for verification, dispute handling, or suspicious-activity review.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Case type</span>
          <select
            value={caseType}
            onChange={(event) => setCaseType(event.target.value as InvestigationCaseType)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)]"
          >
            {investigationCaseTypes.map((value) => (
              <option key={value} value={value}>
                {humanizeEnum(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Priority</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as InvestigationCasePriority)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)]"
          >
            {investigationCasePriorities.map((value) => (
              <option key={value} value={value}>
                {humanizeEnum(value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Summary</span>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={3}
          placeholder="Explain what needs verification or why this item should be investigated."
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
              : "border border-[var(--accent)] text-[var(--accent)] hover:bg-[rgba(200,134,10,0.08)]"
          }`}
        >
          {isPending ? "Saving..." : "Open case"}
        </button>
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-[rgba(26,122,74,0.18)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm leading-6 text-[var(--primary)]">
          {feedback}
          <div className="mt-2">
            <Link
              href="/admin#investigations"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)] underline decoration-[rgba(26,77,46,0.3)] underline-offset-4"
            >
              Jump to investigation queue
            </Link>
          </div>
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
