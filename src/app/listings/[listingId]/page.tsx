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
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]"
          >
            Back to listings
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            {getCategoryLabel(listing.category)}
          </p>
          <h1 className="font-[var(--font-display)] text-4xl leading-tight md:text-5xl">{listing.title}</h1>
          <p className="max-w-3xl text-base leading-7 text-[var(--muted)]">
            Approximate location: {listing.approximateAreaLabel}
            {listing.district ? `, ${listing.district}` : ""}. Exact owner contact and full address stay locked until
            the token unlock step.
          </p>
        </div>
        <div className="rounded-[24px] border border-[rgba(26,77,46,0.14)] bg-[var(--surface)] px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Asking price</p>
          <p className="mt-2 font-[var(--font-display)] text-3xl text-[var(--primary)]">{formatRwf(listing.priceRwf)}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{listing.units} unit(s) / Model {listing.model}</p>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            {orderedMedia[0] ? (
              <div
                className="h-[420px] bg-[var(--surface-alt)] bg-cover bg-center"
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
                  className="h-48 rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] bg-cover bg-center shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                  style={{ backgroundImage: `url("${item.url}")` }}
                />
              ))}
            </section>
          ) : null}

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
              Listing overview
            </p>
            <div className="mt-4 space-y-4 text-base leading-7 text-[var(--muted)]">
              <p>{listing.description}</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Features</p>
            <div className="mt-4 flex flex-wrap gap-3">
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
                <p className="text-sm leading-6 text-[var(--muted)]">No extra features were added for this listing.</p>
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

          <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Location preview</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
              <p>
                Approximate area: {listing.approximateAreaLabel}
                {listing.district ? `, ${listing.district}` : ""}
              </p>
              <p>Exact street address remains hidden until the unlock payment settles.</p>
              <p>Owner type: {humanizeEnum(listing.ownerType)}</p>
              <p>Last updated {formatDateTime(listing.updatedAt)}</p>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
