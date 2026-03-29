"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";
import type { SeekerResponseSummary } from "@/lib/seeker-requests/responses";
import type { SeekerRequestStatus } from "@/lib/domain";

type RequesterSeekerRequestManagerProps = {
  requestId: string;
  currentStatus: SeekerRequestStatus;
  matchedResponseId: string | null;
  matchedResponderName: string | null;
  closureNote: string | null;
  responses: SeekerResponseSummary[];
};

export function RequesterSeekerRequestManager({
  requestId,
  currentStatus,
  matchedResponseId,
  matchedResponderName,
  closureNote,
  responses,
}: RequesterSeekerRequestManagerProps) {
  const router = useRouter();
  const [note, setNote] = useState(closureNote ?? "");
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitStatus(status: "fulfilled" | "closed", responseId?: string) {
    setFeedback(null);
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(`/api/seeker-requests/${requestId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          responseId,
          closureNote: note,
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not update the seeker request status.");
      }

      setFeedback(
        status === "fulfilled"
          ? "Your seeker request was marked fulfilled."
          : "Your seeker request was closed and removed from the active board.",
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update the seeker request status.");
    } finally {
      setIsPending(false);
    }
  }

  if (currentStatus !== "active") {
    return (
      <section className="space-y-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Request outcome</p>
          <h2 className="mt-2 font-[var(--font-display)] text-3xl">{humanizeEnum(currentStatus)}</h2>
        </div>
        <div className="rounded-[24px] bg-[var(--surface-alt)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          {matchedResponderName ? <p>Matched owner: {matchedResponderName}</p> : null}
          {closureNote ? <p>Note: {closureNote}</p> : <p>No closure note was added.</p>}
          {currentStatus === "fulfilled" ? <p>The matched follow-up conversation stays open below.</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Request management</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl">Close the loop on this demand post</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Pick a response when you found a match, or close the request without a match to remove it from the live board.
        </p>
      </div>

      <label className="block text-sm font-semibold text-[var(--foreground)]">
        Optional note
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={isPending}
          className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
          placeholder="Add a note about why you closed the request or why a response was selected."
        />
      </label>

      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
        {responses.length === 0 ? (
          <p>No owner responses have arrived yet. You can still close the request if you no longer need it.</p>
        ) : (
          <p>{responses.length} owner response{responses.length === 1 ? "" : "s"} available to match against this request.</p>
        )}
      </div>

      {responses.length > 0 ? (
        <div className="space-y-4">
          {responses.map((response) => (
            <article
              key={response.id}
              className={`rounded-[24px] border bg-[var(--surface-alt)] p-5 ${
                matchedResponseId === response.id ? "border-[rgba(26,122,74,0.34)]" : "border-[var(--border)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                    {response.responderName}
                  </p>
                  <h3 className="mt-2 font-semibold text-[var(--foreground)]">{humanizeEnum(response.responderRole)}</h3>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    void submitStatus("fulfilled", response.id);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
                    isPending
                      ? "cursor-not-allowed bg-[rgba(26,77,46,0.45)]"
                      : "bg-[var(--primary)] hover:bg-[var(--primary-light)]"
                  }`}
                >
                  Mark as matched
                </button>
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{response.message}</p>

              <div className="mt-4 flex flex-wrap gap-3 text-sm leading-6 text-[var(--muted)]">
                {response.responderPhone ? <span>Phone: {response.responderPhone}</span> : null}
                <span>Updated {formatDateTime(response.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            void submitStatus("closed");
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${
            isPending
              ? "cursor-not-allowed border border-[var(--border)] text-[var(--muted)]"
              : "border border-[var(--accent)] text-[var(--accent)] hover:bg-[rgba(200,134,10,0.08)]"
          }`}
        >
          Close without match
        </button>
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">
          {error}
        </div>
      ) : null}
    </section>
  );
}
