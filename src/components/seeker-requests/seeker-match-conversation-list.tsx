import Link from "next/link";

import { formatDateTime } from "@/lib/formatting/date";
import { getCategoryLabel, humanizeEnum } from "@/lib/formatting/text";
import type { SeekerMatchConversationSummary } from "@/lib/seeker-requests/messaging";

type SeekerMatchConversationListProps = {
  conversations: SeekerMatchConversationSummary[];
  eyebrow: string;
  title: string;
  emptyMessage: string;
};

export function SeekerMatchConversationList({
  conversations,
  eyebrow,
  title,
  emptyMessage,
}: SeekerMatchConversationListProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">{eyebrow}</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl">{title}</h2>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {conversations.map((conversation) => (
            <article
              key={`${conversation.requestId}-${conversation.counterpartName}`}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                    {getCategoryLabel(conversation.requestCategory)}
                  </p>
                  <h3 className="mt-2 font-[var(--font-display)] text-2xl">{conversation.requestTitle}</h3>
                </div>
                <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {humanizeEnum(conversation.requestStatus)}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                <p className="font-semibold text-[var(--foreground)]">
                  {conversation.isRequester ? "Matched owner" : "Matched seeker"}
                </p>
                <p>{conversation.counterpartName}</p>
                <p>
                  {conversation.counterpartRole ? humanizeEnum(conversation.counterpartRole) : "Matched participant"}
                  {conversation.counterpartPhone ? ` / ${conversation.counterpartPhone}` : ""}
                </p>
              </div>

              <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--muted)]">
                <p>
                  {conversation.messageCount > 0
                    ? `${conversation.messageCount} follow-up message${conversation.messageCount === 1 ? "" : "s"} recorded`
                    : "Match confirmed, but no follow-up messages yet"}
                </p>
                <p>
                  {conversation.latestMessagePreview
                    ? `Latest: ${conversation.latestMessagePreview}`
                    : "Open the request to start the first matched follow-up message."}
                </p>
                <p>
                  {conversation.latestMessageAt
                    ? `Last activity ${formatDateTime(conversation.latestMessageAt)}`
                    : conversation.matchedAt
                      ? `Matched ${formatDateTime(conversation.matchedAt)}`
                      : "Recently matched"}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/seeker-requests/${conversation.requestId}`}
                  className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
                >
                  Open conversation
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
