import Link from "next/link";

import { formatRwf } from "@/lib/formatting/currency";
import { getCategoryLabel } from "@/lib/formatting/text";
import { getPublicListings } from "@/lib/listings/public";
import { getPublicSeekerRequests } from "@/lib/seeker-requests/workflow";

const howItWorks = [
  {
    step: "01",
    title: "Browse verified supply",
    body: "See approved listings with price, category, media, and approximate location before any contact details appear.",
  },
  {
    step: "02",
    title: "Pay only when serious",
    body: "A non-refundable token fee unlocks direct owner contact, exact address, and any caretaker or keys-manager details.",
  },
  {
    step: "03",
    title: "Deal directly and safely",
    body: "Owner privacy stays protected until payment settles, while admins keep approvals, audit trails, and payment review in one flow.",
  },
];

const unlockChecklist = [
  "Owner full name and direct phone number",
  "Exact address and map-ready location details",
  "Keys manager or caretaker contact when provided",
];

const neverShown = [
  "National ID or passport details",
  "Ownership proof documents",
  "Private identity numbers or admin-only files",
];

function buildCategorySummary(listings: Awaited<ReturnType<typeof getPublicListings>>) {
  const counts = new Map<Awaited<ReturnType<typeof getPublicListings>>[number]["category"], number>();

  for (const listing of listings) {
    counts.set(listing.category, (counts.get(listing.category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6);
}

export default async function Home() {
  const [listings, seekerRequests] = await Promise.all([
    getPublicListings({ limit: 6 }),
    getPublicSeekerRequests({ limit: 4 }),
  ]);

  const featuredListings = listings.slice(0, 3);
  const highlightedListing = featuredListings[0];
  const demandPreview = seekerRequests.slice(0, 3);
  const categorySummary = buildCategorySummary(listings);
  const modelACount = listings.filter((listing) => listing.model === "A").length;
  const tokenEnabledCount = listings.filter((listing) => listing.tokenFeeEnabled).length;

  return (
    <main className="page-shell mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-5 py-8 md:px-8 md:py-10">
      <section className="hero-shell hero-grid px-6 py-7 md:px-10 md:py-10">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 text-white">
            <div className="space-y-4">
              <p className="eyebrow text-[var(--primary-light)]">Rwanda owner marketplace</p>
              <h1 className="max-w-4xl font-[var(--font-display)] text-5xl leading-[0.98] tracking-[-0.03em] md:text-7xl">
                Connect directly with verified owners.
              </h1>
              <p className="max-w-3xl text-base leading-8 text-[rgba(232,237,235,0.82)] md:text-lg">
                getownerinfo turns serious intent into a protected unlock flow. Buyers browse first, pay a token only
                when they are ready, and reach the real owner without exposing sensitive documents or public phone
                numbers.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/listings" className="pill-button pill-button-primary">
                Browse listings
              </Link>
              <Link href="/listings/new" className="pill-button pill-button-outline">
                Post a listing
              </Link>
              <Link href="/seeker-requests" className="pill-button pill-button-outline">
                Explore seeker demand
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="hero-panel p-4">
                <p className="eyebrow text-[rgba(232,237,235,0.68)]">Live inventory</p>
                <p className="mt-3 font-[var(--font-display)] text-4xl">{listings.length}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.74)]">
                  Approved listings currently visible to buyers.
                </p>
              </div>
              <div className="hero-panel p-4">
                <p className="eyebrow text-[rgba(232,237,235,0.68)]">Token-ready</p>
                <p className="mt-3 font-[var(--font-display)] text-4xl">{tokenEnabledCount}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.74)]">
                  Listings prepared for contact unlocks after payment settlement.
                </p>
              </div>
              <div className="hero-panel p-4">
                <p className="eyebrow text-[rgba(232,237,235,0.68)]">Model A flow</p>
                <p className="mt-3 font-[var(--font-display)] text-4xl">{modelACount}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.74)]">
                  Exclusive commission-ready listings with post-deal reporting.
                </p>
              </div>
            </div>
          </div>

          <div className="hero-panel self-start p-5 text-[var(--dark-copy)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-[var(--primary-light)]">Featured unlock flow</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl text-white">
                  {highlightedListing ? highlightedListing.title : "Verified listing preview"}
                </h2>
              </div>
              <span className="rounded-full border border-[rgba(0,237,100,0.28)] bg-[rgba(0,237,100,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]">
                {highlightedListing ? `Model ${highlightedListing.model}` : "Token protected"}
              </span>
            </div>

            <div className="mt-5 rounded-[1.6rem] border border-[rgba(184,196,194,0.14)] bg-[rgba(255,255,255,0.03)] p-4">
              <div
                className="h-56 rounded-[1.25rem] border border-[rgba(184,196,194,0.1)] bg-[var(--dark-surface-alt)] bg-cover bg-center"
                style={
                  highlightedListing?.coverImageUrl
                    ? { backgroundImage: `linear-gradient(180deg, rgba(0,30,43,0.08), rgba(0,30,43,0.36)), url("${highlightedListing.coverImageUrl}")` }
                    : undefined
                }
              />
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm text-[rgba(232,237,235,0.72)]">
                    {highlightedListing
                      ? `${getCategoryLabel(highlightedListing.category)} · ${highlightedListing.approximateAreaLabel}${highlightedListing.district ? `, ${highlightedListing.district}` : ""}`
                      : "Real estate, vehicles, furniture, appliances, and business assets"}
                  </p>
                  <p className="mt-3 font-[var(--font-display)] text-3xl text-white">
                    {highlightedListing ? formatRwf(highlightedListing.priceRwf) : "Unlock after verified interest"}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-[rgba(184,196,194,0.14)] bg-[rgba(0,0,0,0.16)] px-4 py-3">
                  <p className="eyebrow text-[rgba(232,237,235,0.6)]">Token fee</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--primary-light)]">
                    {highlightedListing?.tokenFeeRwf ? formatRwf(highlightedListing.tokenFeeRwf) : "Configured by category"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[rgba(232,237,235,0.68)]">18% VAT inclusive · Non-refundable</p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-[rgba(184,196,194,0.14)] bg-[rgba(255,255,255,0.04)] p-4">
              <div className="flex items-center justify-between gap-4 border-b border-[rgba(184,196,194,0.12)] pb-3">
                <span className="eyebrow text-[rgba(232,237,235,0.6)]">Owner details</span>
                <span className="eyebrow text-[var(--primary-light)]">Locked until payment</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-[rgba(184,196,194,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                  <span className="text-sm text-[rgba(232,237,235,0.7)]">Owner</span>
                  <span className="font-[var(--font-code)] text-sm uppercase tracking-[0.24em] text-[rgba(232,237,235,0.55)] blur-[2px]">
                    verified owner
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-[rgba(184,196,194,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                  <span className="text-sm text-[rgba(232,237,235,0.7)]">Phone</span>
                  <span className="font-[var(--font-code)] text-sm uppercase tracking-[0.24em] text-[rgba(232,237,235,0.55)] blur-[2px]">
                    +250 xxx xxx xxx
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-[rgba(184,196,194,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                  <span className="text-sm text-[rgba(232,237,235,0.7)]">Exact address</span>
                  <span className="font-[var(--font-code)] text-sm uppercase tracking-[0.24em] text-[rgba(232,237,235,0.55)] blur-[2px]">
                    upi / street / map pin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="metric-tile p-5">
          <p className="eyebrow text-[var(--muted)]">Verified listings</p>
          <p className="mt-3 font-[var(--font-display)] text-4xl text-[var(--foreground)]">{listings.length}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Public inventory reviewed by the admin workflow.</p>
        </article>
        <article className="metric-tile p-5">
          <p className="eyebrow text-[var(--muted)]">Active demand</p>
          <p className="mt-3 font-[var(--font-display)] text-4xl text-[var(--foreground)]">{seekerRequests.length}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Live seeker requests waiting for qualified owner responses.</p>
        </article>
        <article className="metric-tile p-5">
          <p className="eyebrow text-[var(--muted)]">Categories</p>
          <p className="mt-3 font-[var(--font-display)] text-4xl text-[var(--foreground)]">{categorySummary.length || 0}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Real estate, vehicles, furniture, appliances, and business assets.</p>
        </article>
        <article className="metric-tile p-5">
          <p className="eyebrow text-[var(--muted)]">Launch posture</p>
          <p className="mt-3 font-[var(--font-display)] text-4xl text-[var(--foreground)]">24/7</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Public browse, protected unlocks, and an audit-ready admin workspace in one codebase.</p>
        </article>
      </section>

      <section id="how-it-works" className="surface-card px-6 py-7 md:px-8 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <p className="eyebrow text-[var(--primary)]">How it works</p>
            <h2 className="token-accent inline-block font-[var(--font-display)] text-4xl text-[var(--foreground)] md:text-5xl">
              Trust-first by design.
            </h2>
            <p className="max-w-3xl text-base leading-8 text-[var(--muted)]">
              The product is built around privacy, buyer intent, and admin verification. Serious users can move fast
              without exposing contact information too early.
            </p>
          </div>
          <Link href="/sign-in" className="pill-button pill-button-light">
            Open workspace
          </Link>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {howItWorks.map((item) => (
            <article key={item.step} className="surface-card-muted p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="eyebrow text-[var(--primary)]">Step {item.step}</span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,104,74,0.2)] bg-[rgba(0,237,100,0.08)] text-sm font-semibold text-[var(--primary)]">
                  {item.step}
                </span>
              </div>
              <h3 className="mt-4 font-[var(--font-display)] text-3xl text-[var(--foreground)]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card px-6 py-7 md:px-8 md:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
              <p className="eyebrow text-[var(--primary)]">Featured listings</p>
              <h2 className="font-[var(--font-display)] text-4xl text-[var(--foreground)] md:text-5xl">
                Browse before you unlock.
              </h2>
            </div>
            <Link href="/listings" className="pill-button pill-button-light">
              See all listings
            </Link>
          </div>

          {featuredListings.length === 0 ? (
            <div className="mt-8 rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-6 py-10 text-center">
              <p className="eyebrow text-[var(--muted)]">No public inventory yet</p>
              <h3 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--foreground)]">
                Approve the first listing to activate the marketplace.
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Owners can already save drafts and upload proof. Once review decisions go live, this section fills
                automatically.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {featuredListings.map((listing) => (
                <article key={listing.id} className="surface-card-muted overflow-hidden">
                  <div
                    className="h-52 bg-[var(--dark-surface-alt)] bg-cover bg-center"
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
                      <h3 className="font-[var(--font-display)] text-3xl leading-tight text-[var(--foreground)]">
                        {listing.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {listing.approximateAreaLabel}
                        {listing.district ? `, ${listing.district}` : ""}
                      </p>
                    </div>
                    <div className="rounded-[1.3rem] border border-[var(--border)] bg-white px-4 py-3">
                      <p className="eyebrow text-[var(--muted)]">Price</p>
                      <p className="mt-2 font-[var(--font-display)] text-3xl text-[var(--foreground)]">
                        {formatRwf(listing.priceRwf)}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-dashed border-[rgba(0,237,100,0.26)] bg-[rgba(0,237,100,0.06)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                      {listing.tokenFeeEnabled && listing.tokenFeeRwf
                        ? `Unlock owner contact for ${formatRwf(listing.tokenFeeRwf)}.`
                        : "Token rules can still apply after admin configuration."}
                    </div>
                    <Link href={`/listings/${listing.id}`} className="pill-button pill-button-light w-full">
                      View listing
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <section id="token-fee" className="dark-card px-6 py-7 md:px-8 md:py-8">
          <p className="eyebrow text-[var(--primary-light)]">Token fee system</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl text-white">Why the unlock fee exists.</h2>
          <p className="mt-4 text-sm leading-7 text-[rgba(232,237,235,0.8)]">
            The token fee is not a nuisance layer. It filters for serious intent, protects owner privacy, and gives
            buyers confidence that real contact details exist behind the lock.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="hero-panel p-4">
              <p className="eyebrow text-[var(--primary-light)]">Unlocked after payment</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[rgba(232,237,235,0.84)]">
                {unlockChecklist.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-[var(--primary-light)]">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hero-panel p-4">
              <p className="eyebrow text-[var(--accent)]">Never exposed</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[rgba(232,237,235,0.84)]">
                {neverShown.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-[var(--accent)]">x</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/listings" className="pill-button pill-button-primary">
              Browse listings
            </Link>
            <Link href="/seeker-requests" className="pill-button pill-button-outline">
              Study seeker demand
            </Link>
          </div>
        </section>
      </section>

      <section className="surface-card px-6 py-7 md:px-8 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <p className="eyebrow text-[var(--primary)]">Browse categories</p>
            <h2 className="font-[var(--font-display)] text-4xl text-[var(--foreground)] md:text-5xl">
              Supply and demand in the same product.
            </h2>
          </div>
          <Link href="/seeker-requests/new" className="pill-button pill-button-light">
            Post seeker request
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          {categorySummary.length > 0 ? (
            categorySummary.map(([category, count]) => (
              <Link
                key={category}
                href={`/listings?category=${category}`}
                className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <span className="font-semibold">{getCategoryLabel(category)}</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
                  {count}
                </span>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-5 py-5 text-sm leading-7 text-[var(--muted)]">
              Category counts will appear as soon as approved listings are available.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="dark-card px-6 py-7 md:px-8 md:py-8">
          <p className="eyebrow text-[var(--primary-light)]">Seeker board</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl text-white">Let owners come to you.</h2>
          <p className="mt-4 text-sm leading-7 text-[rgba(232,237,235,0.8)]">
            When the right listing is missing, buyers can publish an anonymized request. Owners see the brief, budget,
            and area first, then unlock direct contact only if they are ready to respond.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/seeker-requests" className="pill-button pill-button-primary">
              Explore seeker board
            </Link>
            <Link href="/seeker-requests/new" className="pill-button pill-button-outline">
              Publish demand
            </Link>
          </div>
        </section>

        <div className="surface-card px-6 py-7 md:px-8 md:py-8">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-3">
              <p className="eyebrow text-[var(--primary)]">Demand preview</p>
              <h2 className="font-[var(--font-display)] text-4xl text-[var(--foreground)]">Current market requests</h2>
            </div>
          </div>

          {demandPreview.length === 0 ? (
            <div className="mt-8 rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-5 py-8 text-sm leading-7 text-[var(--muted)]">
              No active seeker requests are visible yet. Once a buyer publishes demand, this panel becomes a live signal
              for owners and managers.
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {demandPreview.map((request) => (
                <article key={request.id} className="surface-card-muted p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="eyebrow rounded-full border border-[rgba(0,104,74,0.16)] bg-[rgba(0,237,100,0.08)] px-3 py-1 text-[var(--primary)]">
                      {getCategoryLabel(request.category)}
                    </span>
                    <span className="eyebrow rounded-full border border-[var(--border)] px-3 py-1 text-[var(--muted)]">
                      {request.durationDays} days
                    </span>
                  </div>
                  <h3 className="mt-4 font-[var(--font-display)] text-3xl text-[var(--foreground)]">{request.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {request.quantityLabel} in {request.approximateAreaLabel}
                    {request.district ? `, ${request.district}` : ""}
                  </p>
                  <div className="mt-4 rounded-[1.2rem] border border-[var(--border)] bg-white px-4 py-3">
                    <p className="eyebrow text-[var(--muted)]">Budget</p>
                    <p className="mt-2 font-[var(--font-display)] text-3xl text-[var(--foreground)]">
                      {formatRwf(request.budgetMinRwf)} - {formatRwf(request.budgetMaxRwf)}
                    </p>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                    Owner view token: {formatRwf(request.viewTokenFeeRwf)}
                  </p>
                  <Link href={`/seeker-requests/${request.id}`} className="pill-button pill-button-light mt-4 w-full">
                    Open request
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="hero-shell px-6 py-7 md:px-8 md:py-8">
        <div className="flex flex-col gap-6 text-white lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl space-y-3">
            <p className="eyebrow text-[var(--primary-light)]">Platform shell</p>
            <h2 className="font-[var(--font-display)] text-4xl leading-tight md:text-5xl">
              One app for public discovery, protected unlocks, and admin operations.
            </h2>
            <p className="max-w-3xl text-base leading-8 text-[rgba(232,237,235,0.82)]">
              The marketplace, owner dashboard, buyer dashboard, payment handoff, seeker board, and review queue are
              already wired into a single Next.js codebase with MongoDB, Cloudinary, and route-level access control.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="pill-button pill-button-primary">
              Open dashboard
            </Link>
            <Link href="/admin" className="pill-button pill-button-outline">
              Admin workspace
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
