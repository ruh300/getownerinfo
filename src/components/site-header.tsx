import Link from "next/link";

import { canAccessAdmin, canCreateListings, type AuthSession } from "@/lib/auth/types";

import { SignOutButton } from "./auth/sign-out-button";

export function SiteHeader({
  session,
  unreadNotificationCount,
}: {
  session: AuthSession | null;
  unreadNotificationCount: number;
}) {
  const role = session?.user.role;

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(184,196,194,0.12)] bg-[rgba(0,30,43,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,237,100,0.36)] bg-[rgba(0,237,100,0.12)] text-[var(--primary-light)]">
              GO
            </span>
            <span className="font-[var(--font-display)] text-[1.85rem] leading-none text-white">getownerinfo</span>
          </Link>
          <span className="eyebrow rounded-full border border-[rgba(184,196,194,0.16)] bg-[rgba(28,45,56,0.82)] px-3 py-1 text-[var(--primary-light)]">
            Verified owner access
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[rgba(232,237,235,0.78)]">
          <Link
            href="/"
            className="rounded-full px-3 py-2 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
          >
            Home
          </Link>
          <Link
            href="/listings"
            className="rounded-full px-3 py-2 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
          >
            Listings
          </Link>
          <Link
            href="/seeker-requests"
            className="rounded-full px-3 py-2 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
          >
            Seeker Requests
          </Link>
          <Link
            href="/#how-it-works"
            className="rounded-full px-3 py-2 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
          >
            How It Works
          </Link>
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-2 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href={role && canAccessAdmin(role) ? "/admin#notifications" : "/dashboard#notifications"}
                className="rounded-full px-3 py-2 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
              >
                Alerts
                {unreadNotificationCount > 0 ? (
                  <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-[10px] font-bold text-[#00130d]">
                    {Math.min(unreadNotificationCount, 99)}
                  </span>
                ) : null}
              </Link>
              {role === "buyer" ? (
                <Link
                  href="/seeker-requests/new"
                  className="rounded-full px-3 py-2 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                >
                  New request
                </Link>
              ) : null}
              {role && canCreateListings(role) ? (
                <Link
                  href="/listings/new"
                  className="rounded-full px-3 py-2 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                >
                  New listing
                </Link>
              ) : null}
              {role && canAccessAdmin(role) ? (
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-2 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                >
                  Admin
                </Link>
              ) : null}
              <div className="flex items-center gap-3 rounded-full border border-[rgba(184,196,194,0.16)] bg-[rgba(28,45,56,0.82)] px-3 py-2 text-white">
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{session.user.fullName}</p>
                  <p className="eyebrow text-[10px] text-[var(--primary-light)]">{session.user.role}</p>
                </div>
                <SignOutButton className="rounded-full border border-[rgba(184,196,194,0.16)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dark-copy)] transition hover:border-[var(--primary-light)] hover:text-[var(--primary-light)]" />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="rounded-full border border-[rgba(184,196,194,0.18)] px-4 py-2 text-white transition hover:border-[var(--primary-light)] hover:text-[var(--primary-light)]"
              >
                Sign in
              </Link>
              <Link
                href="/listings/new"
                className="rounded-full bg-[var(--primary)] px-4 py-2 font-semibold text-[#00130d] transition hover:bg-[var(--primary-light)]"
              >
                Post listing
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
