import Link from "next/link";

import { requireSession } from "@/lib/auth/session";
import { canAccessAdmin, canCreateListings } from "@/lib/auth/types";

export default async function DashboardPage() {
  const session = await requireSession();

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
              ) : null}
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
          <h2 className="mt-3 font-[var(--font-display)] text-2xl">Owner-ready wizard</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Owner and manager roles can move straight into a protected listing flow with contact details prefilled from the session.
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
    </main>
  );
}
