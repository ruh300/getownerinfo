import Link from "next/link";

import { requireSession } from "@/lib/auth/session";
import { canAccessAdmin, canCreateListings } from "@/lib/auth/types";
import { getBuyerWorkspaceData } from "@/lib/dashboard/workspace";
import { formatRwf } from "@/lib/formatting/currency";
import { getOwnerWorkspaceData } from "@/lib/listings/workflow";

export default async function DashboardPage() {
  const session = await requireSession();
  const showOwnerWorkspace = canCreateListings(session.user.role);
  let ownerWorkspace: Awaited<ReturnType<typeof getOwnerWorkspaceData>> | null = null;
  let buyerWorkspace: Awaited<ReturnType<typeof getBuyerWorkspaceData>> | null = null;
  let workspaceError: string | null = null;

  if (showOwnerWorkspace) {
    try {
      ownerWorkspace = await getOwnerWorkspaceData(session);
    } catch (error) {
      workspaceError = error instanceof Error ? error.message : "Could not load your workspace data.";
    }
  } else {
    try {
      buyerWorkspace = await getBuyerWorkspaceData(session);
    } catch (error) {
      workspaceError = error instanceof Error ? error.message : "Could not load your buyer workspace.";
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <section className="overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-10">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Signed workspace</p>
            <h1 className="font-[var(--font-display)] text-4xl leading-tight md:text-5xl">
              Welcome back, {session.user.fullName}.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[var(--muted)]">
              This dashboard is now protected by a signed session cookie and can branch cleanly between buyer, owner, manager, and admin experiences.
            </p>
            <div className="flex flex-wrap gap-3">
              {canCreateListings(session.user.role) ? (
                <Link
                  href="/listings/new"
                  className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
                >
                  Start new listing
                </Link>
              ) : (
                <Link
                  href="/listings"
                  className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
                >
                  Browse listings
                </Link>
              )}
              <Link
                href="/api/status"
                className="rounded-full border border-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
              >
                View system status
              </Link>
              {canAccessAdmin(session.user.role) ? (
                <Link
                  href="/admin"
                  className="rounded-full border border-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:bg-[rgba(200,134,10,0.08)]"
                >
                  Open admin
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-[26px] border border-[rgba(26,77,46,0.12)] bg-[linear-gradient(180deg,rgba(26,77,46,0.98),rgba(20,92,56,1))] p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.72)]">Current session</p>
            <dl className="mt-5 space-y-4 text-sm leading-6 text-[rgba(255,255,255,0.88)]">
              <div>
                <dt className="text-[rgba(255,255,255,0.68)]">Role</dt>
                <dd className="text-lg font-semibold capitalize">{session.user.role}</dd>
              </div>
              <div>
                <dt className="text-[rgba(255,255,255,0.68)]">Phone</dt>
                <dd>{session.user.phone ?? "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-[rgba(255,255,255,0.68)]">Email</dt>
                <dd>{session.user.email ?? "Not provided"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Identity</p>
          <h2 className="mt-3 font-[var(--font-display)] text-2xl">Signed cookie session</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            The app can now distinguish public pages from protected pages without relying on a third-party auth provider yet.
          </p>
        </article>

        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Listings</p>
          <h2 className="mt-3 font-[var(--font-display)] text-2xl">{showOwnerWorkspace ? "Owner-ready workspace" : "Buyer-ready workspace"}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {showOwnerWorkspace
              ? "Owner and manager roles can now save drafts, submit them for review, and track listing status from this dashboard."
              : "Buyer sessions now track unlock history, prototype token-fee payments, and recommended verified listings."}
          </p>
        </article>

        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Operations</p>
          <h2 className="mt-3 font-[var(--font-display)] text-2xl">Admin branch point</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Managers and admins can already branch into a protected review dashboard while we flesh out approvals and audit history next.
          </p>
        </article>
      </section>

      {workspaceError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load live workspace data: {workspaceError}
        </section>
      ) : null}

      {ownerWorkspace ? (
        <>
          <section className="grid gap-6 md:grid-cols-4">
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Drafts</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{ownerWorkspace.stats.draftCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Saved and ready to refine or submit.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Pending</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{ownerWorkspace.stats.pendingCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Listings waiting for admin verification.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Active</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{ownerWorkspace.stats.activeCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Listings currently visible to buyers.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Rejected</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{ownerWorkspace.stats.rejectedCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Listings needing correction before resubmission.</p>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Draft inventory</p>
                  <h2 className="mt-2 font-[var(--font-display)] text-3xl">Saved drafts</h2>
                </div>
                <Link
                  href="/listings/new"
                  className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
                >
                  New draft
                </Link>
              </div>

              {ownerWorkspace.drafts.length === 0 ? (
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                  No saved drafts yet. Start a listing draft and save it from the wizard.
                </div>
              ) : (
                ownerWorkspace.drafts.map((draft) => (
                  <article
                    key={draft.id}
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                          {draft.category.replaceAll("_", " ")}
                        </p>
                        <h3 className="mt-2 font-[var(--font-display)] text-2xl">{draft.title}</h3>
                      </div>
                      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                        <p>{formatRwf(draft.priceRwf)}</p>
                        <p>{draft.units} unit(s)</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                        <p className="font-semibold text-[var(--foreground)]">Recommendation</p>
                        <p>Requested: {draft.requestedModel ?? "none"}</p>
                        <p>Recommended: Model {draft.recommendedModel}</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                        <p className="font-semibold text-[var(--foreground)]">Uploads</p>
                        <p>{draft.mediaCount} image(s)</p>
                        <p>{draft.hasOwnershipProof ? "Proof uploaded" : "Proof pending"}</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                        <p className="font-semibold text-[var(--foreground)]">Linked review</p>
                        <p>{draft.submittedListingId ? `Listing ${draft.submittedListingId}` : "Not submitted yet"}</p>
                        <p>{draft.submittedAt ? new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.submittedAt)) : "Awaiting submission"}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      Last updated {new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.updatedAt))}
                    </p>
                  </article>
                ))
              )}
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Submission status</p>
                <h2 className="mt-2 font-[var(--font-display)] text-3xl">Listings sent to review</h2>
              </div>

              {ownerWorkspace.listings.length === 0 ? (
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                  No listings have been submitted to admin review yet.
                </div>
              ) : (
                ownerWorkspace.listings.map((listing) => (
                  <article
                    key={listing.id}
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                          {listing.category.replaceAll("_", " ")}
                        </p>
                        <h3 className="mt-2 font-[var(--font-display)] text-2xl">{listing.title}</h3>
                      </div>
                      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                        <p>{listing.status.replaceAll("_", " ")}</p>
                        <p>{listing.verificationStatus}</p>
                        <p>Model {listing.model}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                      <p className="font-semibold text-[var(--foreground)]">Review note</p>
                      <p>{listing.reviewNote ?? "No admin note yet."}</p>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      Submitted {new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(listing.submittedAt))}
                    </p>
                  </article>
                ))
              )}
            </section>
          </section>
        </>
      ) : null}

      {buyerWorkspace ? (
        <>
          <section className="grid gap-6 md:grid-cols-4">
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Unlocks</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{buyerWorkspace.stats.unlockCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Listings you have already unlocked.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Spent</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{formatRwf(buyerWorkspace.stats.totalSpentRwf)}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Prototype token-fee payments recorded in your account.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Active contacts</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{buyerWorkspace.stats.activeUnlockCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Unlocked listings that are still active right now.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Payments</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{buyerWorkspace.stats.paymentCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Recorded token-fee payment events.</p>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Unlock history</p>
                  <h2 className="mt-2 font-[var(--font-display)] text-3xl">Recently unlocked listings</h2>
                </div>
                <Link
                  href="/listings"
                  className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
                >
                  Browse more
                </Link>
              </div>

              {buyerWorkspace.unlockedListings.length === 0 ? (
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                  You have not unlocked any listings yet. Open a verified listing and use the prototype unlock flow to create your first buyer record.
                </div>
              ) : (
                buyerWorkspace.unlockedListings.map((listing) => (
                  <article
                    key={listing.listingId}
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                          {listing.category.replaceAll("_", " ")}
                        </p>
                        <h3 className="mt-2 font-[var(--font-display)] text-2xl">{listing.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {listing.approximateAreaLabel} · {listing.ownerName} · {listing.ownerPhone}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                        <p>{formatRwf(listing.priceRwf)}</p>
                        <p>{formatRwf(listing.amountPaidRwf)} paid</p>
                        <p>{listing.stillActive ? "Still active" : "No longer active"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/listings/${listing.listingId}`}
                        className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
                      >
                        Reopen listing
                      </Link>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      Unlocked {new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(listing.unlockedAt))}
                    </p>
                  </article>
                ))
              )}
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Payment ledger</p>
                <h2 className="mt-2 font-[var(--font-display)] text-3xl">Recent token-fee activity</h2>
              </div>

              {buyerWorkspace.recentPayments.length === 0 ? (
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                  No token-fee payments have been recorded yet.
                </div>
              ) : (
                buyerWorkspace.recentPayments.map((payment) => (
                  <article
                    key={payment.id}
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                          {payment.purpose.replaceAll("_", " ")}
                        </p>
                        <h3 className="mt-2 font-semibold text-[var(--foreground)]">{formatRwf(payment.amountRwf)}</h3>
                      </div>
                      <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {payment.status}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{payment.reference}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(payment.createdAt))}
                    </p>
                  </article>
                ))
              )}

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Recommended next</p>
                <h2 className="mt-2 font-[var(--font-display)] text-3xl">Verified listings to explore</h2>
              </div>

              {buyerWorkspace.recommendedListings.length === 0 ? (
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                  Once more listings are approved, recommendations will appear here.
                </div>
              ) : (
                buyerWorkspace.recommendedListings.map((listing) => (
                  <article
                    key={listing.id}
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                      {listing.category.replaceAll("_", " ")}
                    </p>
                    <h3 className="mt-2 font-semibold text-[var(--foreground)]">{listing.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {listing.approximateAreaLabel}
                      {listing.district ? `, ${listing.district}` : ""}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--foreground)]">{formatRwf(listing.priceRwf)}</span>
                      <Link
                        href={`/listings/${listing.id}`}
                        className="rounded-full border border-[var(--primary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
                      >
                        View
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </section>
          </section>
        </>
      ) : null}
    </main>
  );
}
