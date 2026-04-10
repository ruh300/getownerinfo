import Link from "next/link";

import { listingCategories } from "@/lib/domain";
import { formatRwf } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { getCategoryLabel } from "@/lib/formatting/text";
import { getPublicSeekerRequests } from "@/lib/seeker-requests/workflow";

function getTextValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SeekerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = getTextValue(params.q)?.trim() ?? "";
  const category = getTextValue(params.category)?.trim() ?? "";
  const requests = await getPublicSeekerRequests({
    query,
    category,
  });

  return (
    <main className="page-shell mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <section className="hero-shell px-6 py-7 md:px-8 md:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-4 text-white">
            <p className="eyebrow text-[var(--primary-light)]">Anonymized demand board</p>
            <h1 className="font-[var(--font-display)] text-4xl leading-tight md:text-6xl">
              See what serious buyers and tenants need right now.
            </h1>
            <p className="max-w-3xl text-base leading-8 text-[rgba(232,237,235,0.82)]">
              Public seeker requests stay anonymous until an owner pays to unlock the requester contact. That keeps the
              board useful without turning it into a cold-calling feed.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/seeker-requests/new" className="pill-button pill-button-primary">
                Post request
              </Link>
              <Link href="/listings" className="pill-button pill-button-outline">
                Browse listings
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="hero-panel p-5 text-white">
              <p className="eyebrow text-[rgba(232,237,235,0.62)]">Live demand</p>
              <p className="mt-3 font-[var(--font-display)] text-4xl">{requests.length}</p>
              <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.74)]">Active requests visible on the board.</p>
            </div>
            <div className="hero-panel p-5 text-white">
              <p className="eyebrow text-[rgba(232,237,235,0.62)]">Search state</p>
              <p className="mt-3 font-[var(--font-display)] text-4xl">{query ? "Live" : "Open"}</p>
              <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.74)]">
                {query ? `Searching for "${query}"` : "Search by title, area, or need"}
              </p>
            </div>
            <div className="hero-panel p-5 text-white">
              <p className="eyebrow text-[rgba(232,237,235,0.62)]">Access model</p>
              <p className="mt-3 font-[var(--font-display)] text-4xl">Locked</p>
              <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.74)]">
                Requester identity appears only after owner-side unlock payment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card px-6 py-6 md:px-8">
        <form className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_auto]">
          <label className="space-y-2">
            <span className="eyebrow text-[var(--muted)]">Search</span>
            <input
              name="q"
              defaultValue={query}
              className="w-full rounded-[1.15rem] border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
              placeholder="Search by title, need, or area"
            />
          </label>
          <label className="space-y-2">
            <span className="eyebrow text-[var(--muted)]">Category</span>
            <select
              name="category"
              defaultValue={category}
              className="w-full rounded-[1.15rem] border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
            >
              <option value="">All categories</option>
              {listingCategories.map((item) => (
                <option key={item} value={item}>
                  {getCategoryLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="pill-button pill-button-primary w-full lg:w-auto">
              Apply filters
            </button>
          </div>
        </form>
      </section>

      {requests.length === 0 ? (
        <section className="surface-card px-6 py-10 text-center md:px-8">
          <p className="eyebrow text-[var(--primary)]">No active requests</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--foreground)]">
            The seeker board is waiting for its first live demand signal.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Buyers can already publish anonymized demand with a posting payment. Once requests go live, owners can use
            this board to spot what the market wants before matching inventory.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/seeker-requests/new" className="pill-button pill-button-primary">
              Post request
            </Link>
            <Link href="/dashboard" className="pill-button pill-button-light">
              Open dashboard
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((request) => (
            <article key={request.id} className="surface-card-muted p-5">
              <div className="flex flex-wrap gap-2">
                <span className="eyebrow rounded-full border border-[rgba(0,104,74,0.16)] bg-[rgba(0,237,100,0.08)] px-3 py-1 text-[var(--primary)]">
                  {getCategoryLabel(request.category)}
                </span>
                <span className="eyebrow rounded-full border border-[var(--border)] px-3 py-1 text-[var(--muted)]">
                  {request.durationDays} days
                </span>
              </div>
              <h2 className="mt-4 font-[var(--font-display)] text-3xl leading-tight text-[var(--foreground)]">
                {request.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {request.quantityLabel} in {request.approximateAreaLabel}
                {request.district ? `, ${request.district}` : ""}
              </p>
              <div className="mt-5 rounded-[1.35rem] border border-[var(--border)] bg-white px-4 py-3">
                <p className="eyebrow text-[var(--muted)]">Budget range</p>
                <p className="mt-2 font-[var(--font-display)] text-3xl text-[var(--foreground)]">
                  {formatRwf(request.budgetMinRwf)} - {formatRwf(request.budgetMaxRwf)}
                </p>
              </div>
              <div className="mt-4 rounded-[1.2rem] border border-[rgba(0,108,250,0.12)] bg-[rgba(0,108,250,0.05)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                Owner view token: {formatRwf(request.viewTokenFeeRwf)}
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Expires {formatDate(request.expiresAt)}</p>
              <Link href={`/seeker-requests/${request.id}`} className="pill-button pill-button-light mt-4 w-full">
                Open request
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
