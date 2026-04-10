import Link from "next/link";
import { notFound } from "next/navigation";

import { AvailabilityChat } from "@/components/listings/availability-chat";
import { UnlockContactPanel } from "@/components/listings/unlock-contact-panel";
import { getCurrentSession } from "@/lib/auth/session";
import { formatRwf } from "@/lib/formatting/currency";
import { formatDateTime } from "@/lib/formatting/date";
import { getCategoryLabel, humanizeEnum } from "@/lib/formatting/text";
import { hasListingUnlockForSession } from "@/lib/listings/access";
import { getPublicListingDetail } from "@/lib/listings/public";
import { getSingleSearchParam, parsePaymentReturnStatus } from "@/lib/payments/search-params";

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ payment?: string | string[]; paymentReference?: string | string[] }>;
}) {
  const { listingId } = await params;
  const resolvedSearchParams = await searchParams;
  const listing = await getPublicListingDetail(listingId);
  const session = await getCurrentSession();

  if (!listing) {
    notFound();
  }

  const unlocked = session ? await hasListingUnlockForSession(session, listingId) : false;
  const paymentStatus = parsePaymentReturnStatus(resolvedSearchParams.payment);
  const paymentReference = getSingleSearchParam(resolvedSearchParams.paymentReference);
  const exactAddress =
    [listing.upiNumber, listing.streetAddress].filter(Boolean).join(" / ") || "Exact address available after unlock";
  const orderedMedia = [...listing.media].sort((left, right) => Number(right.isCover) - Number(left.isCover));

  return (
    <main className="page-shell mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <section className="hero-shell px-6 py-7 md:px-8 md:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 text-white">
            <Link href="/listings" className="eyebrow inline-flex text-[var(--primary-light)]">
              Back to listings
            </Link>
            <div className="flex flex-wrap gap-2">
              <span className="eyebrow rounded-full border border-[rgba(0,237,100,0.24)] bg-[rgba(0,237,100,0.08)] px-3 py-1 text-[var(--primary-light)]">
                {getCategoryLabel(listing.category)}
              </span>
              <span className="eyebrow rounded-full border border-[rgba(0,108,250,0.2)] bg-[rgba(0,108,250,0.08)] px-3 py-1 text-[#8db8ff]">
                Model {listing.model}
              </span>
              <span className="eyebrow rounded-full border border-[rgba(184,196,194,0.18)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[rgba(232,237,235,0.74)]">
                {listing.units} unit{listing.units === 1 ? "" : "s"}
              </span>
            </div>
            <h1 className="max-w-4xl font-[var(--font-display)] text-4xl leading-tight md:text-6xl">{listing.title}</h1>
            <p className="max-w-3xl text-base leading-8 text-[rgba(232,237,235,0.82)]">
              Approximate area: {listing.approximateAreaLabel}
              {listing.district ? `, ${listing.district}` : ""}. Exact address, direct phone number, and any caretaker
              details stay protected until the unlock payment settles.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="hero-panel px-4 py-3 text-white">
                <p className="eyebrow text-[rgba(232,237,235,0.62)]">Asking price</p>
                <p className="mt-2 font-[var(--font-display)] text-3xl">{formatRwf(listing.priceRwf)}</p>
              </div>
              <div className="hero-panel px-4 py-3 text-white">
                <p className="eyebrow text-[rgba(232,237,235,0.62)]">Owner type</p>
                <p className="mt-2 text-lg font-semibold">{humanizeEnum(listing.ownerType)}</p>
              </div>
              <div className="hero-panel px-4 py-3 text-white">
                <p className="eyebrow text-[rgba(232,237,235,0.62)]">Token policy</p>
                <p className="mt-2 text-lg font-semibold">
                  {listing.tokenFeeEnabled && listing.tokenFeeRwf ? formatRwf(listing.tokenFeeRwf) : "Configured by platform"}
                </p>
              </div>
            </div>
          </div>

          <div className="hero-panel p-5 text-[var(--dark-copy)]">
            <p className="eyebrow text-[var(--primary-light)]">Protected access</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl text-white">
              Buyer unlocks happen only after payment confirmation.
            </h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-[1.25rem] border border-[rgba(184,196,194,0.12)] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                <p className="eyebrow text-[rgba(232,237,235,0.56)]">Before unlock</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.82)]">
                  Buyers can review media, price, features, and ask availability-only questions.
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-[rgba(184,196,194,0.12)] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                <p className="eyebrow text-[rgba(232,237,235,0.56)]">After unlock</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.82)]">
                  Owner name, direct phone, and exact address become visible for this buyer account only.
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-[rgba(184,196,194,0.12)] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                <p className="eyebrow text-[rgba(232,237,235,0.56)]">Never shown</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(232,237,235,0.82)]">
                  National ID details and ownership proof stay admin-only even after payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="surface-card overflow-hidden">
            {orderedMedia[0] ? (
              <div
                className="h-[420px] bg-[var(--dark-surface-alt)] bg-cover bg-center"
                style={{ backgroundImage: `url("${orderedMedia[0].url}")` }}
              />
            ) : (
              <div className="flex h-[320px] items-center justify-center bg-[var(--surface-alt)] text-sm text-[var(--muted)]">
                No media uploaded yet.
              </div>
            )}
          </section>

          {orderedMedia.length > 1 ? (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orderedMedia.slice(1).map((item) => (
                <div
                  key={item.assetId}
                  className="surface-card-muted h-48 bg-[var(--dark-surface-alt)] bg-cover bg-center"
                  style={{ backgroundImage: `url("${item.url}")` }}
                />
              ))}
            </section>
          ) : null}

          <section className="surface-card px-6 py-6">
            <p className="eyebrow text-[var(--primary)]">Listing overview</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--foreground)]">What buyers should know first.</h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-[var(--muted)]">
              <p>{listing.description}</p>
            </div>
          </section>

          <section className="surface-card px-6 py-6">
            <p className="eyebrow text-[var(--primary)]">Features</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {listing.features.length > 0 ? (
                listing.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-2 text-sm font-medium text-[var(--foreground)]"
                  >
                    {feature}
                  </span>
                ))
              ) : (
                <p className="text-sm leading-7 text-[var(--muted)]">No extra features were added for this listing.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <UnlockContactPanel
            listingId={listing.id}
            tokenFeeEnabled={listing.tokenFeeEnabled}
            tokenFeeRwf={listing.tokenFeeRwf}
            ownerName={listing.ownerName}
            ownerPhone={listing.ownerPhone}
            exactAddress={exactAddress}
            signedIn={Boolean(session)}
            initiallyUnlocked={unlocked}
            paymentStatus={paymentStatus}
            paymentReference={paymentReference}
          />
          <AvailabilityChat
            listingId={listing.id}
            signedIn={Boolean(session)}
            viewerRole={session?.user.role}
            unlocked={unlocked}
          />

          <section className="dark-card px-6 py-6">
            <p className="eyebrow text-[var(--primary-light)]">Location preview</p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-[rgba(232,237,235,0.82)]">
              <p>
                Approximate area: {listing.approximateAreaLabel}
                {listing.district ? `, ${listing.district}` : ""}
              </p>
              <p>Exact street address and UPI remain hidden until the unlock payment settles.</p>
              <p>Owner type: {humanizeEnum(listing.ownerType)}</p>
              <p>Last updated {formatDateTime(listing.updatedAt)}</p>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
