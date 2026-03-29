import Link from "next/link";

import { listingCategories, type ListingCategory } from "@/lib/domain";
import { formatRwf } from "@/lib/formatting/currency";
import { getPublicListings } from "@/lib/listings/public";

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

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = getTextValue(params.q)?.trim() ?? "";
  const category = getTextValue(params.category)?.trim() ?? "";
  const listings = await getPublicListings({
    query,
    category,
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <section className="overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <div className="grid gap-6 px-6 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-10">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Browse live inventory</p>
            <h1 className="font-[var(--font-display)] text-4xl leading-tight md:text-5xl">
              Explore verified listings before you decide to unlock owner contact.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[var(--muted)]">
              Only admin-approved listings appear here. Buyers see photos, pricing, features, and approximate location first, then pay a token only when they are ready for direct owner access.
            </p>
          </div>
          <div className="rounded-[26px] border border-[rgba(26,77,46,0.12)] bg-[linear-gradient(180deg,rgba(26,77,46,0.98),rgba(20,92,56,1))] p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.72)]">Marketplace status</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl">{listings.length}</h2>
            <p className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.84)]">
              Approved listing{listings.length === 1 ? "" : "s"} currently visible in the public browse experience.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        <form className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_auto]">
          <input
            name="q"
            defaultValue={query}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Search by title, description, or location"
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

      {listings.length === 0 ? (
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">No live results yet</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl">Approve the first listing to activate the public marketplace.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Owners can already save and submit drafts. Once an admin approves a listing, it will appear here automatically for buyers to browse.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
            >
              Open workspace
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
          {listings.map((listing) => (
            <article
              key={listing.id}
              className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_48px_rgba(0,0,0,0.08)]"
            >
              <div
                className="h-56 bg-[var(--surface-alt)] bg-cover bg-center"
                style={listing.coverImageUrl ? { backgroundImage: `url("${listing.coverImageUrl}")` } : undefined}
              />
              <div className="space-y-4 p-6">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[rgba(26,77,46,0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                    {categoryLabels[listing.category]}
                  </span>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Model {listing.model}
                  </span>
                </div>
                <div>
                  <h2 className="font-[var(--font-display)] text-3xl leading-tight">{listing.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {listing.approximateAreaLabel}
                    {listing.district ? `, ${listing.district}` : ""}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]">Price</p>
                  <p className="mt-2 font-[var(--font-display)] text-3xl">{formatRwf(listing.priceRwf)}</p>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm leading-6 text-[var(--muted)]">
                  <p>{listing.featureCount} feature{listing.featureCount === 1 ? "" : "s"}</p>
                  <p>
                    {listing.tokenFeeEnabled && listing.tokenFeeRwf
                      ? `Unlock for ${formatRwf(listing.tokenFeeRwf)}`
                      : "Token unlock rules apply"}
                  </p>
                </div>
                <Link
                  href={`/listings/${listing.id}`}
                  className="inline-flex rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--primary-light)]"
                >
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
