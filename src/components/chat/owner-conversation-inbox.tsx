"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { OwnerInquirySummary } from "@/lib/chat/workflow";
import { formatDateTime } from "@/lib/formatting/date";
import { getCategoryLabel, humanizeEnum } from "@/lib/formatting/text";

type OwnerConversationInboxProps = {
  threads: OwnerInquirySummary[];
};

export function OwnerConversationInbox({ threads }: OwnerConversationInboxProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleReply(thread: OwnerInquirySummary) {
    const draft = drafts[thread.id]?.trim() ?? "";

    if (draft.length < 4) {
      setError("Write a slightly more detailed reply before sending.");
      return;
    }

    setError(null);
    setNotice(null);
    setBusyId(thread.id);

    try {
      const response = await fetch(`/api/listings/${thread.listingId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: draft,
          buyerUserId: thread.buyerUserId,
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not send the owner reply.");
      }

      setDrafts((current) => ({ ...current, [thread.id]: "" }));
      setNotice(`Reply sent to ${thread.buyerName}.`);
      router.refresh();
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Could not send the owner reply.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <div className="rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">
          {error}
        </div>
      ) : null}

      {threads.length === 0 ? (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          No buyer inquiries yet. When buyers ask clean pre-unlock questions from a listing page, they will appear here.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {threads.map((thread) => {
            const canReply = thread.buyerUnlockedListing && thread.listingStatus === "active";

            return (
              <article
                key={thread.id}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                      {getCategoryLabel(thread.listingCategory)}
                    </p>
                    <h3 className="mt-2 font-[var(--font-display)] text-2xl">{thread.listingTitle}</h3>
                  </div>
                  <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    {humanizeEnum(thread.listingStatus)}
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Buyer</p>
                  <p>{thread.buyerName}</p>
                  <p>{thread.buyerPhone ?? "Phone unavailable"}</p>
                  <p>{thread.messageCount} message(s) / Latest from {humanizeEnum(thread.lastSenderRole)}</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--foreground)]">{thread.body}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Latest activity {formatDateTime(thread.createdAt)}</p>
                {canReply ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={drafts[thread.id] ?? ""}
                      onChange={(event) => setDrafts((current) => ({ ...current, [thread.id]: event.target.value }))}
                      rows={4}
                      maxLength={800}
                      placeholder="Reply to the buyer now that the listing has been unlocked."
                      className="min-h-28 w-full rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
                    />
                    <button
                      type="button"
                      disabled={busyId === thread.id}
                      onClick={() => {
                        void handleReply(thread);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
                        busyId === thread.id ? "cursor-not-allowed bg-[rgba(26,77,46,0.45)]" : "bg-[var(--primary)] hover:bg-[var(--primary-light)]"
                      }`}
                    >
                      {busyId === thread.id ? "Sending..." : "Reply to buyer"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                    {thread.buyerUnlockedListing
                      ? "Replies are paused because the listing is no longer active."
                      : "Owner replies unlock after the buyer completes the listing token unlock."}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
