import Link from "next/link";
import { notFound } from "next/navigation";

import { UnlockSeekerContactPanel } from "@/components/seeker-requests/unlock-seeker-contact-panel";
import { getCurrentSession } from "@/lib/auth/session";
import { canCreateListings } from "@/lib/auth/types";
import { formatRwf } from "@/lib/formatting/currency";
import { hasSeekerRequestUnlockForSession } from "@/lib/seeker-requests/access";
import { getPublicSeekerRequestDetail } from "@/lib/seeker-requests/workflow";

export default async function SeekerRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const request = await getPublicSeekerRequestDetail(requestId);
  const session = await getCurrentSession();

  if (!request) {
    notFound();
  }

  const unlocked = session ? await hasSeekerRequestUnlockForSession(session, requestId) : false;
  const canUnlock = session ? canCreateListings(session.user.role) : false;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <Link
            href="/seeker-requests"
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]"
          >
            Back to seeker board
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            {request.category.replaceAll("_", " ")}
          </p>
          <h1 className="font-[var(--font-display)] text-4xl leading-tight md:text-5xl">{request.title}</h1>
          <p className="max-w-3xl text-base leading-7 text-[var(--muted)]">
            Public demand is visible, but the seeker identity and full requirement notes stay locked until an owner-side token unlock happens.
          </p>
        </div>
        <div className="rounded-[24px] border border-[rgba(26,77,46,0.14)] bg-[var(--surface)] px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Budget range</p>
          <p className="mt-2 font-[var(--font-display)] text-3xl text-[var(--primary)]">
            {formatRwf(request.budgetMinRwf)} - {formatRwf(request.budgetMaxRwf)}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{request.durationDays} day request window</p>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Public request snapshot</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                <p className="font-semibold text-[var(--foreground)]">Quantity or type</p>
                <p>{request.quantityLabel}</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                <p className="font-semibold text-[var(--foreground)]">Approximate area</p>
                <p>
                  {request.approximateAreaLabel}
                  {request.district ? `, ${request.district}` : ""}
                  {request.sector ? `, ${request.sector}` : ""}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                <p className="font-semibold text-[var(--foreground)]">Visibility</p>
                <p>Anonymous public request</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                <p className="font-semibold text-[var(--foreground)]">Expiry</p>
                <p>{new Intl.DateTimeFormat("en-RW", { dateStyle: "medium" }).format(new Date(request.expiresAt))}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Requirement preview</p>
            <div className="mt-4 space-y-4 text-base leading-7 text-[var(--muted)]">
              <p>{unlocked ? request.details : request.detailsPreview}</p>
            </div>
            {!unlocked ? (
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                The public board only shows a preview. Full requirement notes unlock with the seeker contact token.
              </p>
            ) : null}
          </section>

          {unlocked ? (
            <section className="rounded-[28px] border border-[rgba(26,122,74,0.24)] bg-[linear-gradient(180deg,#edfaf3,#f7fffb)] p-6 shadow-[0_20px_50px_rgba(26,122,74,0.12)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Unlocked seeker contact</p>
              <div className="mt-5 space-y-3 rounded-[24px] border border-[rgba(26,122,74,0.18)] bg-white/80 p-4 text-sm leading-6 text-[var(--foreground)]">
                <div className="flex items-center justify-between gap-3">
                  <span>Seeker full name</span>
                  <span className="font-semibold">{request.contactName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Phone number</span>
                  <span className="font-semibold">{request.contactPhone}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Preferred contact time</span>
                  <span className="font-semibold">{request.preferredContactTime}</span>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <UnlockSeekerContactPanel
            requestId={request.id}
            tokenFeeRwf={request.viewTokenFeeRwf}
            signedIn={Boolean(session)}
            canUnlock={canUnlock}
            initiallyUnlocked={unlocked}
          />

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Unlock rules</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
              <p>Buyer identity stays anonymized on the public board.</p>
              <p>Owner, manager, and admin accounts can prototype-unlock seeker contact for {formatRwf(request.viewTokenFeeRwf)}.</p>
              <p>All unlock actions create payment and audit records for the future real payment flow.</p>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
