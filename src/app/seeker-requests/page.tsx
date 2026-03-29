import Link from "next/link";

import { listingCategories, type ListingCategory } from "@/lib/domain";
import { formatRwf } from "@/lib/formatting/currency";
import { getPublicSeekerRequests } from "@/lib/seeker-requests/workflow";

const categoryLabels: Record<ListingCategory, string> = {
  real_estate_rent: "Real Estate Rent",
  real_estate_sale: "Real Estate Sale",
  vehicles_for_sale: "Vehicles for Sale",
  vehicle_resellers: "Vehicle Resellers",
  furniture: "Furniture",
  made_in_rwanda: "Made in Rwanda",
  home_appliances: "Home Appliances",
  business_industry: "Business and Industry",
};

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
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <section className="overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <div className="grid gap-6 px-6 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-10">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Anonymized demand board</p>
            <h1 className="font-[var(--font-display)] text-4xl leading-tight md:text-5xl">
              See what buyers and tenants are actively searching for.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[var(--muted)]">
              Seeker requests stay public but anonymized. Owners can study live demand by category, budget, and approximate location, then prototype-unlock seeker contact details from the request page when they are ready to follow up.
            </p>
          </div>
          <div className="rounded-[26px] border border-[rgba(26,77,46,0.12)] bg-[linear-gradient(180deg,rgba(26,77,46,0.98),rgba(20,92,56,1))] p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.72)]">Board status</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl">{requests.length}</h2>
            <p className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.84)]">
              Active seeker request{requests.length === 1 ? "" : "s"} currently visible on the marketplace board.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/seeker-requests/new"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[rgba(255,255,255,0.88)]"
              >
                Post request
              </Link>
              <Link
                href="/listings"
                className="rounded-full border border-[rgba(255,255,255,0.24)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[rgba(255,255,255,0.08)]"
              >
                Browse listings
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        <form className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_auto]">
          <input
            name="q"
            defaultValue={query}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Search by title, need, or area"
          />
          <select
            name="category"
            defaultValue={category}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
          >
            <option value="">All categories</option>
            {listingCategories.map((item) => (
              <option key={item} value={item}>
                {categoryLabels[item]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
          >
            Search
          </button>
        </form>
      </section>

      {requests.length === 0 ? (
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">No active requests yet</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl">Post the first seeker request to activate this board.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Buyers can already publish anonymized demand with a prototype post-fee record. Once requests go live, owners can use this board to spot unmet demand.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/seeker-requests/new"
              className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
            >
              Post request
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
            >
              View dashboard
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((request) => (
            <article
              key={request.id}
              className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.08)]"
            >
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[rgba(26,77,46,0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                  {categoryLabels[request.category]}
                </span>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {request.durationDays} days
                </span>
              </div>
              <h2 className="mt-4 font-[var(--font-display)] text-3xl leading-tight">{request.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {request.quantityLabel} in {request.approximateAreaLabel}
                {request.district ? `, ${request.district}` : ""}
              </p>
              <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]">Budget range</p>
                <p className="mt-2 font-[var(--font-display)] text-2xl">
                  {formatRwf(request.budgetMinRwf)} - {formatRwf(request.budgetMaxRwf)}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm leading-6 text-[var(--muted)]">
                <p>Anonymous public request</p>
                <p>View token {formatRwf(request.viewTokenFeeRwf)}</p>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                Expires{" "}
                {new Intl.DateTimeFormat("en-RW", { dateStyle: "medium" }).format(new Date(request.expiresAt))}
              </p>
              <Link
                href={`/seeker-requests/${request.id}`}
                className="mt-4 inline-flex rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
              >
                Open request
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
