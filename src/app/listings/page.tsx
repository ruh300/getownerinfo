import Link from "next/link";

import { listingCategories } from "@/lib/domain";
import { formatRwf } from "@/lib/formatting/currency";
import { getCategoryLabel } from "@/lib/formatting/text";
import { getPublicListings } from "@/lib/listings/public";

function getTextValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = getTextValue(params.q)?.trim() ?? "";
  const category = getTextValue(params.category)?.trim() ?? "";
  const selectedCategoryLabel = listingCategories.includes(category as (typeof listingCategories)[number])
    ? getCategoryLabel(category as (typeof listingCategories)[number])
    : null;
  const listings = await getPublicListings({
    query,
    category,
  });

  return (
    <main className="page-shell mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <section className="hero-shell px-6 py-7 md:px-8 md:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 text-white">
            <p className="eyebrow text-[var(--primary-light)]">Public marketplace</p>
            <h1 className="font-[var(--font-display)] text-4xl leading-tight md:text-6xl">
              Browse approved inventory before you decide to unlock contact.
            </h1>
            <p className="max-w-3xl text-base leading-8 text-[rgba(232,237,235,0.82)]">
              Every listing here has passed the review workflow. Buyers see pricing, media, features, and approximate
              location first, then move into the protected token flow only when they are serious.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/seeker-requests" className="pill-button pill-button-primary">
                See seeker demand
              </Link>
              <Link href="/listings/new" className="pill-button pill-button-outline">
                Post a listing
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="hero-panel p-5 text-white">
              <p className="eyebrow text-[rgba(232,237,235,0.62)]">Results</p>
              <p className="mt-3 font-[var(--font-display)] text-4xl">{listings.length}</p>
              <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.74)]">Approved listings visible right now.</p>
            </div>
            <div className="hero-panel p-5 text-white">
              <p className="eyebrow text-[rgba(232,237,235,0.62)]">Filter</p>
              <p className="mt-3 font-[var(--font-display)] text-4xl">{category ? "1" : "All"}</p>
              <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.74)]">
                {selectedCategoryLabel ?? "Every supported category"}
              </p>
            </div>
            <div className="hero-panel p-5 text-white">
              <p className="eyebrow text-[rgba(232,237,235,0.62)]">Search state</p>
              <p className="mt-3 font-[var(--font-display)] text-4xl">{query ? "Live" : "Open"}</p>
              <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.74)]">
                {query ? `Searching for "${query}"` : "Search by title, area, or description"}
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
              placeholder="Search by title, description, or location"
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

      {listings.length === 0 ? (
        <section className="surface-card px-6 py-10 text-center md:px-8">
          <p className="eyebrow text-[var(--primary)]">No live results</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--foreground)]">
            Nothing matches this search yet.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Adjust the filters, clear the search, or switch to the seeker board if you want owners to come to you when
            the right listing is not live yet.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/seeker-requests/new" className="pill-button pill-button-primary">
              Post seeker request
            </Link>
            <Link href="/dashboard" className="pill-button pill-button-light">
              Open dashboard
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <article key={listing.id} className="surface-card-muted overflow-hidden">
              <div
                className="h-60 bg-[var(--dark-surface-alt)] bg-cover bg-center"
                style={listing.coverImageUrl ? { backgroundImage: `url("${listing.coverImageUrl}")` } : undefined}
              />
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="eyebrow rounded-full border border-[rgba(0,104,74,0.16)] bg-[rgba(0,237,100,0.08)] px-3 py-1 text-[var(--primary)]">
                    {getCategoryLabel(listing.category)}
                  </span>
                  <span className="eyebrow rounded-full border border-[rgba(0,108,250,0.14)] bg-[rgba(0,108,250,0.06)] px-3 py-1 text-[var(--accent)]">
                    Model {listing.model}
                  </span>
                </div>
                <div>
                  <h2 className="font-[var(--font-display)] text-3xl leading-tight text-[var(--foreground)]">
                    {listing.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {listing.approximateAreaLabel}
                    {listing.district ? `, ${listing.district}` : ""}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-[var(--border)] bg-white px-4 py-3">
                  <p className="eyebrow text-[var(--muted)]">Asking price</p>
                  <p className="mt-2 font-[var(--font-display)] text-3xl text-[var(--foreground)]">
                    {formatRwf(listing.priceRwf)}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-[rgba(0,237,100,0.22)] bg-[rgba(0,237,100,0.06)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  {listing.tokenFeeEnabled && listing.tokenFeeRwf
                    ? `Owner contact unlocks for ${formatRwf(listing.tokenFeeRwf)} once payment settles.`
                    : "Token access is controlled by the platform fee rules for this category."}
                </div>
                <div className="flex items-center justify-between gap-3 text-sm leading-6 text-[var(--muted)]">
                  <span>{listing.featureCount} feature{listing.featureCount === 1 ? "" : "s"}</span>
                  <span>{listing.model === "A" ? "Exclusive workflow available" : "Pay-to-list workflow"}</span>
                </div>
                <Link href={`/listings/${listing.id}`} className="pill-button pill-button-light w-full">
                  View listing
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
