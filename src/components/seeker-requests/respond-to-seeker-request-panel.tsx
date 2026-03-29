"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SeekerResponseSummary } from "@/lib/seeker-requests/responses";

type RespondToSeekerRequestPanelProps = {
  requestId: string;
  canRespond: boolean;
  existingResponse: SeekerResponseSummary | null;
};

export function RespondToSeekerRequestPanel({
  requestId,
  canRespond,
  existingResponse,
}: RespondToSeekerRequestPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState(existingResponse?.message ?? "");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/seeker-requests/${requestId}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        updated?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not save the seeker response.");
      }

      setSuccessMessage(payload.updated ? "Your response was updated for this seeker request." : "Your response was sent to the seeker.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save the seeker response.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[rgba(26,77,46,0.14)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Owner response</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--foreground)]">
        {existingResponse ? "Refine your direct reply" : "Send a direct response"}
      </h2>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
        Your reply becomes visible to the seeker in their dashboard together with your role and phone number.
      </p>

      <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
        <label htmlFor="seeker-response-message" className="text-sm font-semibold text-[var(--foreground)]">
          Response message
        </label>
        <textarea
          id="seeker-response-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          disabled={!canRespond || isSubmitting}
          placeholder="Explain what you have available, why it fits, the timeframe, and the best next step."
          className="mt-3 min-h-[160px] w-full rounded-[20px] border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[rgba(26,122,74,0.12)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
        />
      </div>

      {existingResponse ? (
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Your latest response is already on file. Updating it will replace the previous version the seeker sees.
        </p>
      ) : null}

      {!canRespond ? (
        <p className="mt-4 rounded-2xl border border-[rgba(200,134,10,0.22)] bg-[rgba(200,134,10,0.08)] px-4 py-3 text-sm leading-6 text-[#8a5a07]">
          This seeker request is no longer open for new responses.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={!canRespond || isSubmitting}
          className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
            !canRespond || isSubmitting
              ? "cursor-not-allowed bg-[rgba(26,122,74,0.4)]"
              : "bg-[var(--primary)] hover:bg-[var(--primary-light)]"
          }`}
        >
          {isSubmitting ? "Saving..." : existingResponse ? "Update response" : "Send response"}
        </button>
      </div>

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
