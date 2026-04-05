"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InvestigationCaseLauncher } from "@/components/admin/investigation-case-launcher";
import { formatRwf } from "@/lib/formatting/currency";
import { formatDate, formatDateTime } from "@/lib/formatting/date";
import { getCategoryLabel, humanizeEnum } from "@/lib/formatting/text";
import type { AdminAuditSummary, AdminDecisionSummary, AdminReviewSummary } from "@/lib/listings/workflow";

type ReviewBoardProps = {
  reviewQueue: AdminReviewSummary[];
  recentDecisions: AdminDecisionSummary[];
  recentActivity: AdminAuditSummary[];
};

export function ReviewBoard({ reviewQueue, recentDecisions, recentActivity }: ReviewBoardProps) {
  const router = useRouter();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [internalNotes, setInternalNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteBusyId, setNoteBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDecision(listingId: string, decision: "approve" | "reject") {
    setMessage(null);
    setError(null);
    setBusyId(listingId);

    try {
      const response = await fetch(`/api/admin/listings/${listingId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          reviewNote: reviewNotes[listingId] ?? "",
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not apply the review decision.");
      }

      setMessage(decision === "approve" ? "Listing approved successfully." : "Listing rejected successfully.");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not apply the review decision.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleInternalNoteSave(listingId: string) {
    setMessage(null);
    setError(null);
    setNoteBusyId(listingId);

    try {
      const response = await fetch(`/api/admin/listings/${listingId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note: internalNotes[listingId] ?? "",
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not save the internal note.");
      }

      setInternalNotes((current) => ({ ...current, [listingId]: "" }));
      setMessage("Internal note saved.");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save the internal note.");
    } finally {
      setNoteBusyId(null);
    }
  }

  return (
    <section className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Pending review</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl">Approval queue</h2>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
              {reviewQueue.length} waiting
            </span>
          </div>

          {reviewQueue.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              No listings are currently waiting for review.
            </div>
          ) : (
            reviewQueue.map((listing) => (
              <article
                key={listing.id}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                      {getCategoryLabel(listing.category)}
                    </p>
                    <h3 className="font-[var(--font-display)] text-2xl">{listing.title}</h3>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {listing.ownerName}
                      {listing.ownerRole ? ` (${humanizeEnum(listing.ownerRole)})` : ""}
                      {" / "}
                      {listing.ownerPhone}
                      {" / "}
                      {humanizeEnum(listing.ownerType)}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                    <p>{formatRwf(listing.priceRwf)}</p>
                    <p>{listing.units} unit(s)</p>
                    <p>Model {listing.model}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Owner history</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        Previous listings, unresolved balances, and repeated outcomes that may need review before approval.
                      </p>
                    </div>
                    {listing.ownerRisk.riskFlags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {listing.ownerRisk.riskFlags.map((flag) => (
                          <span
                            key={flag}
                            className="rounded-full border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#9c2d2d]"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="rounded-full border border-[rgba(26,122,74,0.18)] bg-[rgba(26,122,74,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                        No active risk flags
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                      <p className="font-semibold text-[var(--foreground)]">Listings</p>
                      <p>{listing.ownerRisk.totalListingCount} total</p>
                      <p>{listing.ownerRisk.activeListingCount} active</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                      <p className="font-semibold text-[var(--foreground)]">Review history</p>
                      <p>{listing.ownerRisk.rejectedListingCount} rejected</p>
                      <p>{listing.ownerRisk.notConcludedCount} not concluded</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                      <p className="font-semibold text-[var(--foreground)]">Commission risk</p>
                      <p>{listing.ownerRisk.dueCommissionCount} due case(s)</p>
                      <p>{listing.ownerRisk.overdueCommissionCount} overdue</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                      <p className="font-semibold text-[var(--foreground)]">Penalty balance</p>
                      <p>{listing.ownerRisk.unpaidPenaltyCount} unpaid penalty case(s)</p>
                      <p>{formatRwf(listing.ownerRisk.unpaidBalanceRwf)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                    <p className="font-semibold text-[var(--foreground)]">Media</p>
                    <p>{listing.mediaCount} upload(s)</p>
                    <p>{listing.hasOwnershipProof ? "Ownership proof uploaded" : "Ownership proof missing"}</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                    <p className="font-semibold text-[var(--foreground)]">Submitted</p>
                    <p>{formatDateTime(listing.submittedAt)}</p>
                    <p>Last update {formatDate(listing.updatedAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                    <p className="font-semibold text-[var(--foreground)]">Review note</p>
                    <p>{listing.reviewNote ?? "No review note yet."}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Internal notes</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        Private admin-only notes for disputes, suspicious signals, or support follow-up.
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      {listing.internalNoteCount} saved
                    </span>
                  </div>

                  {listing.latestInternalNote ? (
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                      <p className="font-semibold text-[var(--foreground)]">Latest note</p>
                      <p className="mt-1">{listing.latestInternalNote.note}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--primary-light)]">
                        {listing.latestInternalNote.actorName}
                        {listing.latestInternalNote.actorRole
                          ? ` / ${humanizeEnum(listing.latestInternalNote.actorRole)}`
                          : ""}
                        {" / "}
                        {formatDateTime(listing.latestInternalNote.createdAt)}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                      No internal notes saved yet for this listing.
                    </div>
                  )}

                  <textarea
                    value={internalNotes[listing.id] ?? ""}
                    onChange={(event) =>
                      setInternalNotes((current) => ({ ...current, [listing.id]: event.target.value }))
                    }
                    className="min-h-24 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                    placeholder="Add an internal note for support, verification, or risk follow-up..."
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={noteBusyId === listing.id}
                      onClick={() => {
                        void handleInternalNoteSave(listing.id);
                      }}
                      className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
                        noteBusyId === listing.id
                          ? "cursor-not-allowed bg-[rgba(26,77,46,0.45)]"
                          : "bg-[var(--accent)] hover:bg-[#a06b08]"
                      }`}
                    >
                      {noteBusyId === listing.id ? "Saving..." : "Save internal note"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <textarea
                    value={reviewNotes[listing.id] ?? ""}
                    onChange={(event) => setReviewNotes((current) => ({ ...current, [listing.id]: event.target.value }))}
                    className="min-h-24 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                    placeholder="Optional review note for approval or rejection..."
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={busyId === listing.id}
                      onClick={() => {
                        void handleDecision(listing.id, "approve");
                      }}
                      className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
                        busyId === listing.id ? "cursor-not-allowed bg-[rgba(26,77,46,0.45)]" : "bg-[var(--primary)] hover:bg-[var(--primary-light)]"
                      }`}
                    >
                      {busyId === listing.id ? "Working..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === listing.id}
                      onClick={() => {
                        void handleDecision(listing.id, "reject");
                      }}
                      className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
                        busyId === listing.id ? "cursor-not-allowed bg-[rgba(184,50,50,0.35)]" : "bg-[#9c2d2d] hover:bg-[#7c2323]"
                      }`}
                    >
                      {busyId === listing.id ? "Working..." : "Reject"}
                    </button>
                  </div>
                </div>

                <InvestigationCaseLauncher
                  entityType="listing"
                  entityId={listing.id}
                  defaultCaseType="document_verification"
                  canManage
                  label="Escalate listing review"
                />
              </article>
            ))
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Recent decisions</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl">Latest review outcomes</h2>
          </div>

          {recentDecisions.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              No admin decisions have been recorded yet.
            </div>
          ) : (
            recentDecisions.map((decision) => (
              <article
                key={decision.id}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                  {humanizeEnum(decision.status)}
                </p>
                <h3 className="mt-2 font-semibold text-[var(--foreground)]">{decision.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{decision.ownerName}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {decision.reviewedAt ? formatDateTime(decision.reviewedAt) : "Awaiting timestamp"}
                </p>
                <p className="mt-3 rounded-2xl bg-[var(--surface-alt)] px-3 py-2 text-sm leading-6 text-[var(--muted)]">
                  {decision.reviewNote ?? "No review note recorded."}
                </p>
              </article>
            ))
          )}

          <div className="pt-2">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Audit activity</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl">Recent system actions</h2>
          </div>

          {recentActivity.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              No audit activity has been recorded yet.
            </div>
          ) : (
            recentActivity.map((entry) => (
              <article
                key={entry.id}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                      {humanizeEnum(entry.action)}
                    </p>
                    <h3 className="mt-2 font-semibold text-[var(--foreground)]">{humanizeEnum(entry.entityType)}</h3>
                  </div>
                  <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    {formatDateTime(entry.createdAt)}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {entry.actorName}
                  {entry.actorRole ? ` / ${humanizeEnum(entry.actorRole)}` : ""} / {entry.entityId}
                </p>
                <p className="mt-3 rounded-2xl bg-[var(--surface-alt)] px-3 py-2 text-sm leading-6 text-[var(--muted)]">
                  {entry.metadataSummary ?? "No extra metadata recorded for this action."}
                </p>
              </article>
            ))
          )}
        </section>
      </div>
    </section>
  );
}
