"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";

import type {
  SeekerMatchConversationData,
  SeekerMatchMessageSummary,
} from "@/lib/seeker-requests/messaging";
import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";

type SeekerMatchChatProps = {
  conversation: SeekerMatchConversationData;
};

type ConversationResponse = {
  status: "ok" | "error";
  message?: string;
  conversation?: SeekerMatchConversationData;
  entry?: SeekerMatchMessageSummary;
};

export function SeekerMatchChat({ conversation }: SeekerMatchChatProps) {
  const [messages, setMessages] = useState(conversation.messages);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMessages(conversation.messages);
  }, [conversation.messages]);

  async function refreshConversation(showNotice = false) {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`/api/seeker-requests/${conversation.requestId}/messages`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as ConversationResponse;

      if (!response.ok || payload.status !== "ok" || !payload.conversation) {
        throw new Error(payload.message ?? "Could not refresh this matched conversation.");
      }

      setMessages(payload.conversation.messages);

      if (showNotice) {
        setNotice("Conversation refreshed.");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not refresh this matched conversation.");
    } finally {
      setIsRefreshing(false);
    }
  }

  const pollConversation = useEffectEvent(() => {
    void refreshConversation(false);
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      pollConversation();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [conversation.requestId]);

  return (
    <section className="rounded-[28px] border border-[rgba(26,122,74,0.24)] bg-[linear-gradient(180deg,#eefaf4,#fbfffd)] p-6 shadow-[0_20px_50px_rgba(26,122,74,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Matched follow-up</p>
          <h2 className="mt-3 font-[var(--font-display)] text-2xl">Continue the conversation</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[rgba(26,122,74,0.18)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
            {conversation.isRequester ? "Requester thread" : "Matched responder thread"}
          </span>
          <button
            type="button"
            onClick={() => {
              void refreshConversation(true);
            }}
            disabled={isRefreshing}
            className="rounded-full border border-[rgba(26,122,74,0.18)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[rgba(26,122,74,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
        The requester selected this match, so the thread is now private between both sides for scheduling, clarifications, and next steps.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[rgba(26,122,74,0.16)] bg-white/80 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Matched with</p>
          <p>{conversation.counterpartName}</p>
          <p>{conversation.counterpartRole ? humanizeEnum(conversation.counterpartRole) : "Matched participant"}</p>
        </div>
        <div className="rounded-2xl border border-[rgba(26,122,74,0.16)] bg-white/80 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Contact line</p>
          <p>{conversation.counterpartPhone ?? "Use the in-app thread first."}</p>
          <p>{conversation.messageCount} message(s) recorded</p>
        </div>
        <div className="rounded-2xl border border-[rgba(26,122,74,0.16)] bg-white/80 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Match status</p>
          <p>{humanizeEnum(conversation.requestStatus)}</p>
          <p>{conversation.matchedAt ? `Selected ${formatDateTime(conversation.matchedAt)}` : "Recently selected"}</p>
        </div>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setNotice(null);

          startTransition(async () => {
            try {
              const response = await fetch(`/api/seeker-requests/${conversation.requestId}/messages`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  body: draft,
                }),
              });
              const payload = (await response.json()) as ConversationResponse;

              if (!response.ok || payload.status !== "ok" || !payload.entry) {
                throw new Error(payload.message ?? "Could not send your matched follow-up message.");
              }

              setMessages((current) => [...current, payload.entry!]);
              setDraft("");
              setNotice("Message sent to the matched participant.");
            } catch (submitError) {
              setError(
                submitError instanceof Error
                  ? submitError.message
                  : "Could not send your matched follow-up message.",
              );
            }
          });
        }}
      >
        <label className="block">
          <span className="sr-only">Matched conversation message</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={1200}
            placeholder="Share next steps, preferred meeting time, negotiation notes, or documents still needed."
            className="min-h-32 w-full rounded-[24px] border border-[rgba(26,122,74,0.18)] bg-white px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-5 text-[var(--muted)]">
            Use this thread for follow-up after the match. Phone, schedule, and negotiation details are now allowed here.
          </p>
          <button
            type="submit"
            disabled={isPending || draft.trim().length < 4}
            className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Sending..." : "Send follow-up"}
          </button>
        </div>
      </form>

      {notice ? (
        <div className="mt-4 rounded-2xl border border-[rgba(26,122,74,0.24)] bg-white/80 px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
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
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Conversation timeline</p>
          <span className="text-xs text-[var(--muted)]">Auto-refreshes every 30 seconds</span>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-[24px] border border-[rgba(26,122,74,0.16)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            No follow-up messages yet. Start with timing, viewing details, negotiation range, or what happens next.
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderUserId === conversation.viewerUserId;

            return (
              <article
                key={message.id}
                className={`rounded-[24px] border px-4 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.04)] ${
                  isOwnMessage
                    ? "border-[rgba(26,122,74,0.26)] bg-[rgba(26,122,74,0.08)]"
                    : "border-[rgba(26,77,46,0.12)] bg-white/85"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{message.senderName}</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                      {humanizeEnum(message.senderRole)}
                    </p>
                  </div>
                  <span className="text-xs leading-5 text-[var(--muted)]">{formatDateTime(message.createdAt)}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{message.body}</p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
