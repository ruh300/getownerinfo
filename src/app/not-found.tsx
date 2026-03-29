import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl items-center px-5 py-12 md:px-8">
      <section className="w-full overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <div className="grid gap-8 px-6 py-10 md:grid-cols-[0.85fr_1.15fr] md:px-10">
          <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(26,77,46,0.98),rgba(20,92,56,1))] p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.72)]">404</p>
            <h1 className="mt-4 font-[var(--font-display)] text-4xl leading-tight">This page is not available.</h1>
            <p className="mt-4 text-sm leading-7 text-[rgba(255,255,255,0.82)]">
              The link may be outdated, the listing may have been removed, or the route may not exist yet in the current build.
            </p>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Keep moving</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl">Use one of the live product paths instead.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              The marketplace, seeker board, protected dashboard, and admin queue are already wired. Jump back into a route that is part of the current flow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
              >
                Home
              </Link>
              <Link
                href="/listings"
                className="rounded-full border border-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
              >
                Browse listings
              </Link>
              <Link
                href="/seeker-requests"
                className="rounded-full border border-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:bg-[rgba(200,134,10,0.08)]"
              >
                Explore seeker board
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
