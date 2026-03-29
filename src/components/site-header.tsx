import Link from "next/link";

import { canAccessAdmin, canCreateListings, type AuthSession } from "@/lib/auth/types";

import { SignOutButton } from "./auth/sign-out-button";

export function SiteHeader({ session }: { session: AuthSession | null }) {
  const role = session?.user.role;

  return (
    <header className="border-b border-[rgba(26,77,46,0.08)] bg-[rgba(247,245,240,0.88)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-[var(--font-display)] text-2xl text-[var(--primary)]">
            getownerinfo
          </Link>
          <span className="rounded-full border border-[rgba(200,134,10,0.28)] bg-[rgba(200,134,10,0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            MVP workspace
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-[var(--muted)]">
          <Link href="/" className="rounded-full px-3 py-2 transition hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]">
            Home
          </Link>
          {session ? (
            <>
              <Link href="/dashboard" className="rounded-full px-3 py-2 transition hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]">
                Dashboard
              </Link>
              {role && canCreateListings(role) ? (
                <Link href="/listings/new" className="rounded-full px-3 py-2 transition hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]">
                  New listing
                </Link>
              ) : null}
              {role && canAccessAdmin(role) ? (
                <Link href="/admin" className="rounded-full px-3 py-2 transition hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]">
                  Admin
                </Link>
              ) : null}
              <div className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-white px-3 py-2">
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{session.user.fullName}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--primary-light)]">{session.user.role}</p>
                </div>
                <SignOutButton className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)] transition hover:bg-[var(--surface-alt)]" />
              </div>
            </>
          ) : (
            <Link href="/sign-in" className="rounded-full bg-[var(--primary)] px-4 py-2 text-white transition hover:bg-[var(--primary-light)]">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
