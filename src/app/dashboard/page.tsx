import Link from "next/link";

import { OwnerConversationInbox } from "@/components/chat/owner-conversation-inbox";
import { ListingStatusManager } from "@/components/listings/listing-status-manager";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { PendingPaymentList } from "@/components/payments/pending-payment-list";
import { SeekerMatchConversationList } from "@/components/seeker-requests/seeker-match-conversation-list";
import { SeekerResponseList } from "@/components/seeker-requests/seeker-response-list";
import { requireSession } from "@/lib/auth/session";
import { canAccessAdmin, canCreateListings } from "@/lib/auth/types";
import { getBuyerWorkspaceData } from "@/lib/dashboard/workspace";
import { formatRwf } from "@/lib/formatting/currency";
import { formatDate, formatDateTime } from "@/lib/formatting/date";
import { getCategoryLabel, humanizeEnum } from "@/lib/formatting/text";
import { getOwnerWorkspaceData } from "@/lib/listings/workflow";
import { getNotificationCenterForSession } from "@/lib/notifications/workflow";

export default async function DashboardPage() {
  const session = await requireSession();
  const showOwnerWorkspace = canCreateListings(session.user.role);
  let ownerWorkspace: Awaited<ReturnType<typeof getOwnerWorkspaceData>> | null = null;
  let buyerWorkspace: Awaited<ReturnType<typeof getBuyerWorkspaceData>> | null = null;
  let notificationCenter: Awaited<ReturnType<typeof getNotificationCenterForSession>> | null = null;
  let workspaceError: string | null = null;
  let notificationError: string | null = null;

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

  try {
    notificationCenter = await getNotificationCenterForSession(session);
  } catch (error) {
    notificationError = error instanceof Error ? error.message : "Could not load notifications.";
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
                <>
                  <Link
                    href="/listings/new"
                    className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
                  >
                    Start new listing
                  </Link>
                  <Link
                    href="/seeker-requests"
                    className="rounded-full border border-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:bg-[rgba(200,134,10,0.08)]"
                  >
                    Explore seeker demand
                  </Link>
                </>
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
                ? "Owner and manager roles can now save drafts, submit them for review, track listing status, and monitor incoming buyer inquiries."
                : "Buyer sessions now track unlock history, pending checkout intents, settled payment records, seeker requests, and recommended verified listings."}
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

      {notificationError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load notifications: {notificationError}
        </section>
      ) : null}

      {notificationCenter ? (
        <NotificationCenter
          center={notificationCenter}
          eyebrow="Alerts"
          title="Notification center"
          emptyMessage="You have no notifications yet. Listing reviews, unlocks, seeker actions, and buyer inquiries will appear here."
        />
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
                          {getCategoryLabel(draft.category)}
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
                        <p>{draft.submittedAt ? formatDateTime(draft.submittedAt) : "Awaiting submission"}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      Last updated {formatDateTime(draft.updatedAt)}
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
                          {getCategoryLabel(listing.category)}
                        </p>
                        <h3 className="mt-2 font-[var(--font-display)] text-2xl">{listing.title}</h3>
                      </div>
                      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                        <p>{humanizeEnum(listing.status)}</p>
                        <p>{listing.verificationStatus}</p>
                        <p>Model {listing.model}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                      <p className="font-semibold text-[var(--foreground)]">Review note</p>
                      <p>{listing.reviewNote ?? "No admin note yet."}</p>
                    </div>
                    {listing.lifecycleActionCount > 0 ? (
                      <ListingStatusManager listingId={listing.id} currentStatus={listing.status} />
                    ) : null}
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      Submitted {formatDateTime(listing.submittedAt)}
                    </p>
                  </article>
                ))
              )}
            </section>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Buyer inquiries</p>
                <h2 className="mt-2 font-[var(--font-display)] text-3xl">Recent pre-unlock questions</h2>
              </div>
              <Link
                href="/listings"
                className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
              >
                View marketplace
              </Link>
            </div>

            <OwnerConversationInbox threads={ownerWorkspace.inquiries} />
          </section>

          <SeekerMatchConversationList
            conversations={ownerWorkspace.matchedSeekerConversations}
            eyebrow="Matched seeker follow-up"
            title="Seeker conversations after a match"
            emptyMessage="When a seeker selects your response, the matched follow-up conversation will appear here."
          />
        </>
      ) : null}

      {buyerWorkspace ? (
        <>
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-6">
              <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Unlocks</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl">{buyerWorkspace.stats.unlockCount}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Listings you have already unlocked.</p>
              </article>
              <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Spent</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl">{formatRwf(buyerWorkspace.stats.totalSpentRwf)}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Settled unlock payments recorded in your account.</p>
              </article>
              <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Active contacts</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl">{buyerWorkspace.stats.activeUnlockCount}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Unlocked listings that are still active right now.</p>
              </article>
              <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Pending checkout</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl">{buyerWorkspace.stats.pendingPaymentCount}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Unlocks waiting for payment confirmation.</p>
              </article>
              <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Seeker posts</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl">{buyerWorkspace.stats.seekerRequestCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Requests you have published to the demand board.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Live demand</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{buyerWorkspace.stats.activeSeekerRequestCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Active seeker requests still visible publicly.</p>
              </article>
            </section>

            <PendingPaymentList payments={buyerWorkspace.pendingPayments} />

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
                  You have not unlocked any listings yet. Open a verified listing and complete the checkout flow to reveal your first owner contact.
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
                          {getCategoryLabel(listing.category)}
                        </p>
                        <h3 className="mt-2 font-[var(--font-display)] text-2xl">{listing.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {listing.approximateAreaLabel} / {listing.ownerName} / {listing.ownerPhone}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                        <p>{formatRwf(listing.priceRwf)}</p>
                        <p>{formatRwf(listing.amountPaidRwf)} paid</p>
                        <p>{humanizeEnum(listing.status)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {listing.canViewPublicDetail ? (
                        <Link
                          href={`/listings/${listing.listingId}`}
                          className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
                        >
                          Reopen listing
                        </Link>
                      ) : (
                        <span className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          No longer public
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      Unlocked {formatDateTime(listing.unlockedAt)}
                    </p>
                  </article>
                ))
              )}
            </section>

              <section className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Payment ledger</p>
                  <h2 className="mt-2 font-[var(--font-display)] text-3xl">Recent unlock payment activity</h2>
                </div>

                {buyerWorkspace.recentPayments.length === 0 ? (
                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                    No unlock payment records have been created yet.
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
                            {humanizeEnum(payment.purpose)}
                          </p>
                          <h3 className="mt-2 font-semibold text-[var(--foreground)]">{formatRwf(payment.amountRwf)}</h3>
                        </div>
                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                            payment.status === "paid"
                              ? "border-[rgba(26,122,74,0.18)] bg-[rgba(26,122,74,0.08)] text-[var(--primary)]"
                              : payment.status === "pending"
                                ? "border-[rgba(200,134,10,0.2)] bg-[rgba(200,134,10,0.08)] text-[var(--accent)]"
                                : "border-[rgba(184,50,50,0.18)] bg-[rgba(184,50,50,0.08)] text-[#9c2d2d]"
                          }`}
                        >
                          {humanizeEnum(payment.status)}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                        {payment.linkedLabel ?? "Linked listing unavailable"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{payment.reference}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {payment.status === "pending" && payment.checkoutExpiresAt
                          ? `Awaiting confirmation until ${formatDateTime(payment.checkoutExpiresAt)}`
                          : formatDateTime(payment.createdAt)}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        {payment.status === "pending" && payment.checkoutPath ? (
                          <Link
                            href={payment.checkoutPath}
                            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#a06b08]"
                          >
                            Continue checkout
                          </Link>
                        ) : null}
                        {payment.linkedPath ? (
                          <Link
                            href={payment.linkedPath}
                            className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
                          >
                            Open listing
                          </Link>
                        ) : null}
                      </div>
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
                      {getCategoryLabel(listing.category)}
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

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Seeker requests</p>
                <h2 className="mt-2 font-[var(--font-display)] text-3xl">Your live demand posts</h2>
              </div>
              <Link
                href="/seeker-requests/new"
                className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
              >
                New request
              </Link>
            </div>

            {buyerWorkspace.seekerRequests.length === 0 ? (
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                No seeker requests yet. Post one when the right listing is missing and you want owners to come to you.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {buyerWorkspace.seekerRequests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                          {getCategoryLabel(request.category)}
                        </p>
                        <h3 className="mt-2 font-[var(--font-display)] text-2xl">{request.title}</h3>
                      </div>
                      <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {humanizeEnum(request.status)}
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                      <p className="font-semibold text-[var(--foreground)]">Budget</p>
                      <p>
                        {formatRwf(request.budgetMinRwf)} - {formatRwf(request.budgetMaxRwf)}
                      </p>
                      <p>
                        {request.quantityLabel} in {request.approximateAreaLabel}
                        {request.district ? `, ${request.district}` : ""}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm leading-6 text-[var(--muted)]">
                      <span>{formatRwf(request.postedFeeRwf)} posted</span>
                      <span>{request.durationDays} day window</span>
                      <span>{request.responseCount} response{request.responseCount === 1 ? "" : "s"}</span>
                    </div>
                    {request.matchedResponderName ? (
                      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                        Matched owner: {request.matchedResponderName}
                      </p>
                    ) : null}
                    {request.closureNote ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Note: {request.closureNote}</p>
                    ) : null}
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      {request.status === "fulfilled" && request.fulfilledAt
                        ? `Fulfilled ${formatDate(request.fulfilledAt)}`
                        : request.status === "closed" && request.closedAt
                          ? `Closed ${formatDate(request.closedAt)}`
                          : `Expires ${formatDate(request.expiresAt)}`}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/seeker-requests/${request.id}`}
                        className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
                      >
                        Open request
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <SeekerMatchConversationList
            conversations={buyerWorkspace.matchedSeekerConversations}
            eyebrow="Matched follow-up"
            title="Conversations after a match"
            emptyMessage="Once you select an owner response, the matched follow-up thread will stay visible here."
          />

          <SeekerResponseList
            responses={buyerWorkspace.recentSeekerResponses}
            eyebrow="Owner replies"
            title="Recent seeker responses"
            emptyMessage="No owner responses yet. Once unlocked owners answer your seeker requests, they will appear here."
            showRequestLink
          />
        </>
      ) : null}
    </main>
  );
}
