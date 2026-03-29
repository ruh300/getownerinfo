import Link from "next/link";

const stackItems = [
  "Next.js 16 + React 19",
  "MongoDB Atlas Free",
  "Cloudinary Free uploads",
  "Vercel deployment path",
];

const nextSteps = [
  "Wire real AfrIPay orchestration for listing, token, and seeker fees.",
  "Complete listing lifecycle states like sold, rented, expired, and not concluded.",
  "Expand post-unlock messaging and seeker fulfillment workflows.",
  "Harden production auth, moderation, rate limits, and deployment settings.",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-10 md:px-10 md:py-14">
      <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_rgba(26,77,46,0.08)]">
        <div className="grid gap-10 px-6 py-10 md:grid-cols-[1.3fr_0.9fr] md:px-10 md:py-12">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-[rgba(200,134,10,0.35)] bg-[rgba(200,134,10,0.12)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Free-first starter
            </span>
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary-light)]">
                getownerinfo repository
              </p>
              <h1 className="font-[var(--font-display)] text-4xl leading-tight md:text-6xl">
                Build the marketplace around verified owners, token unlocks, and trust-first flows.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
                This repository is now prepared as the app root for a Vercel-friendly MVP using MongoDB Atlas
                and Cloudinary. The current build already includes admin review, payment records, audit feeds,
                and notification centers across the protected workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/listings"
                className="rounded-full border border-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:bg-[rgba(200,134,10,0.08)]"
              >
                Browse Listings
              </Link>
              <Link
                href="/seeker-requests"
                className="rounded-full border border-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
              >
                Browse Seeker Requests
              </Link>
              <Link
                href="/listings/new"
                className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
              >
                Start Listing Draft
              </Link>
              <Link
                href="/seeker-requests/new"
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#d9971d]"
              >
                Post Seeker Request
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {stackItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-2 text-sm font-medium text-[var(--primary)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(26,77,46,0.12)] bg-[linear-gradient(180deg,rgba(26,77,46,0.98),rgba(20,92,56,1))] p-6 text-white">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.7)]">
                Immediate roadmap
              </p>
              <ul className="space-y-3 text-sm leading-6 text-[rgba(255,255,255,0.88)]">
                {nextSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.14)] text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Data</p>
          <h2 className="mt-3 font-[var(--font-display)] text-2xl">MongoDB Atlas Free</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Start with listings, seeker requests, users, token unlocks, payments, and audit logs as focused collections. Keep
            immutable records append-only from day one.
          </p>
        </article>

        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Media</p>
          <h2 className="mt-3 font-[var(--font-display)] text-2xl">Cloudinary Uploads</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Use direct browser uploads for listing images and signed restricted uploads for ownership proofs so
            Vercel functions stay light.
          </p>
        </article>

        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Deployment</p>
          <h2 className="mt-3 font-[var(--font-display)] text-2xl">Vercel-ready</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            The app starts with a single Next.js codebase so public pages, dashboards, route handlers, and
            admin tools can evolve together without extra hosting cost.
          </p>
        </article>
      </section>
    </main>
  );
}
