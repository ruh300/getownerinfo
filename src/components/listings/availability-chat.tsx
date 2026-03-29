"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import type { ListingMessageSummary } from "@/lib/chat/workflow";
import type { UserRole } from "@/lib/domain";
import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";

type AvailabilityChatProps = {
  listingId: string;
  signedIn: boolean;
  viewerRole?: UserRole;
  unlocked: boolean;
};

type MessageResponse = {
  status: "ok" | "error";
  message?: string;
  messages?: ListingMessageSummary[];
  delivered?: boolean;
  error?: string | null;
  entry?: ListingMessageSummary;
};

const composerPlaceholder =
  "Ask about availability, visit timing, condition, or next steps. Phone numbers, direct links, and exact addresses stay blocked until unlock.";

export function AvailabilityChat({
  listingId,
  signedIn,
  viewerRole,
  unlocked,
}: AvailabilityChatProps) {
  const [messages, setMessages] = useState<ListingMessageSummary[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!signedIn || viewerRole !== "buyer") {
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/listings/${listingId}/messages`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as MessageResponse;

        if (!response.ok || payload.status !== "ok") {
          throw new Error(payload.message ?? "Could not load your listing inquiries.");
        }

        if (!cancelled) {
          setMessages(payload.messages ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load your listing inquiries.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [listingId, signedIn, viewerRole]);

  if (!signedIn) {
    return (
      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Availability questions</p>
        <h2 className="mt-3 font-[var(--font-display)] text-2xl">Ask before you unlock</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Sign in as a buyer to ask the owner about availability, timing, and general fit before paying the token fee.
        </p>
        <Link
          href="/sign-in"
          className="mt-5 inline-flex rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
        >
          Sign in to ask
        </Link>
      </section>
    );
  }

  if (viewerRole !== "buyer") {
    return (
      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Availability questions</p>
        <h2 className="mt-3 font-[var(--font-display)] text-2xl">Buyer channel</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          This inquiry panel is currently reserved for buyer accounts. Owners already receive new inquiries inside the protected dashboard.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Availability questions</p>
          <h2 className="mt-3 font-[var(--font-display)] text-2xl">Message the owner safely</h2>
        </div>
        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          {unlocked ? "Unlocked thread" : "Pre-unlock filter"}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
        {unlocked
          ? "You have already unlocked this listing, so your follow-up messages can include direct contact details if needed."
          : "Before unlock, the system blocks phone numbers, emails, direct links, and exact location clues. Ask about availability, price flexibility, and visit timing instead."}
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setNotice(null);

          startTransition(async () => {
            try {
              const response = await fetch(`/api/listings/${listingId}/messages`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  body: draft,
                }),
              });
              const payload = (await response.json()) as MessageResponse;

              if (!response.ok || payload.status !== "ok" || !payload.entry) {
                throw new Error(payload.message ?? "Could not send your inquiry.");
              }

              const entry = payload.entry;

              setMessages((current) => [...current, entry]);
              setDraft("");
              setNotice(payload.delivered ? "Your inquiry was sent to the owner." : payload.error ?? "Your message was blocked.");

              if (!payload.delivered) {
                setError(payload.error ?? "Your message was blocked before unlock.");
              }
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : "Could not send your inquiry.");
            }
          });
        }}
      >
        <label className="block">
          <span className="sr-only">Your inquiry</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={800}
            placeholder={composerPlaceholder}
            className="min-h-32 w-full rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-5 text-[var(--muted)]">{draft.length}/800 characters</p>
          <button
            type="submit"
            disabled={isPending || draft.trim().length < 4}
            className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Sending..." : "Send inquiry"}
          </button>
        </div>
      </form>

      {notice ? (
        <div className="mt-4 rounded-2xl border border-[rgba(26,77,46,0.12)] bg-[rgba(26,77,46,0.06)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-[rgba(184,50,50,0.18)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm leading-6 text-[#9c2d2d]">
          {error}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Your recent inquiries</p>
          {isLoading ? <span className="text-xs text-[var(--muted)]">Loading...</span> : null}
        </div>

        {messages.length === 0 ? (
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            No messages yet. Start with a simple question like availability, viewing window, or whether the price is negotiable.
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.04)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">{message.senderName}</p>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                    message.status === "sent"
                      ? "border border-[rgba(26,77,46,0.14)] bg-[rgba(26,77,46,0.08)] text-[var(--primary)]"
                      : "border border-[rgba(184,50,50,0.18)] bg-[rgba(184,50,50,0.08)] text-[#9c2d2d]"
                  }`}
                >
                  {message.status === "sent" ? "Delivered" : "Blocked"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{message.body}</p>
              {message.blockedContentTypes.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.blockedContentTypes.map((type) => (
                    <span
                      key={`${message.id}-${type}`}
                      className="rounded-full border border-[rgba(184,50,50,0.18)] bg-[rgba(184,50,50,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9c2d2d]"
                    >
                      {humanizeEnum(type)}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                {formatDateTime(message.createdAt)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
