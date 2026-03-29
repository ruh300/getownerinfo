import Link from "next/link";

import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";
import type { SeekerResponseSummary } from "@/lib/seeker-requests/responses";

type SeekerResponseListProps = {
  responses: SeekerResponseSummary[];
  title?: string;
  eyebrow?: string;
  emptyMessage: string;
  showRequestLink?: boolean;
};

export function SeekerResponseList({
  responses,
  title = "Owner responses",
  eyebrow = "Responses",
  emptyMessage,
  showRequestLink = false,
}: SeekerResponseListProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">{eyebrow}</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl">{title}</h2>
      </div>

      {responses.length === 0 ? (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          {emptyMessage}
        </div>
      ) : (
        responses.map((response) => (
          <article
            key={response.id}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                  {response.responderName}
                </p>
                <h3 className="mt-2 font-semibold text-[var(--foreground)]">{humanizeEnum(response.responderRole)}</h3>
              </div>
              <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                {humanizeEnum(response.status)}
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{response.message}</p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm leading-6 text-[var(--muted)]">
              {response.responderPhone ? <span>Phone: {response.responderPhone}</span> : null}
              <span>Updated {formatDateTime(response.updatedAt)}</span>
            </div>

            {showRequestLink ? (
              <div className="mt-4">
                <Link
                  href={`/seeker-requests/${response.seekerRequestId}`}
                  className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
                >
                  Open {response.requestTitle}
                </Link>
              </div>
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}
