"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PaymentReturnNotice } from "@/components/payments/payment-return-notice";
import { formatRwf } from "@/lib/formatting/currency";
import type { PaymentReturnStatus } from "@/lib/payments/search-params";

type UnlockContactPanelProps = {
  listingId: string;
  tokenFeeEnabled: boolean;
  tokenFeeRwf?: number;
  ownerName: string;
  ownerPhone: string;
  exactAddress: string;
  signedIn: boolean;
  initiallyUnlocked: boolean;
  paymentStatus?: PaymentReturnStatus | null;
  paymentReference?: string | null;
};

export function UnlockContactPanel({
  listingId,
  tokenFeeEnabled,
  tokenFeeRwf,
  ownerName,
  ownerPhone,
  exactAddress,
  signedIn,
  initiallyUnlocked,
  paymentStatus,
  paymentReference,
}: UnlockContactPanelProps) {
  const router = useRouter();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);
  const [copiedField, setCopiedField] = useState<"phone" | "address" | null>(null);

  async function handleUnlock() {
    setMessage(null);
    setError(null);
    setIsUnlocking(true);

    try {
      const response = await fetch(`/api/listings/${listingId}/unlock`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        message?: string;
        reused?: boolean;
        unlocked?: boolean;
        checkoutUrl?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not unlock the listing.");
      }

      if (payload.unlocked) {
        setUnlocked(true);
        setMessage(
          payload.reused
            ? "This listing was already unlocked in your account."
            : "Listing contact details unlocked for this account.",
        );
        router.refresh();
        return;
      }

      if (payload.checkoutUrl) {
        setMessage("Checkout created. Redirecting to the payment confirmation screen...");
        window.location.assign(payload.checkoutUrl);
        return;
      }

      throw new Error("A payment checkout could not be created for this listing.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not unlock the listing.");
    } finally {
      setIsUnlocking(false);
    }
  }

  async function copyValue(field: "phone" | "address", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setMessage(field === "phone" ? "Owner phone copied to your clipboard." : "Exact address copied to your clipboard.");
      window.setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 1800);
    } catch {
      setError("Copy failed on this device. You can still select the text manually.");
    }
  }

  if (unlocked) {
    return (
      <section className="surface-card overflow-hidden">
        <div className="bg-[linear-gradient(180deg,rgba(0,30,43,0.98),rgba(28,45,56,0.95))] px-6 py-6 text-[var(--dark-copy)]">
          {paymentStatus === "paid" ? (
            <div className="mb-4">
              <PaymentReturnNotice status={paymentStatus} reference={paymentReference} subject="Listing contact unlock" />
            </div>
          ) : null}
          <p className="eyebrow text-[var(--primary-light)]">Access unlocked</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl text-white">Direct owner details are now visible.</h2>
          <p className="mt-3 text-sm leading-7 text-[rgba(232,237,235,0.8)]">
            Contact details are tied to this buyer account and intended for a real follow-up, not public redistribution.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4">
            <p className="eyebrow text-[var(--muted)]">Owner</p>
            <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{ownerName}</p>
          </div>

          <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-[var(--muted)]">Phone number</p>
                <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{ownerPhone}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${ownerPhone}`}
                  className="pill-button pill-button-light min-h-0 px-3 py-2 text-xs"
                >
                  Call
                </a>
                <button
                  type="button"
                  onClick={() => {
                    void copyValue("phone", ownerPhone);
                  }}
                  className="pill-button pill-button-light min-h-0 px-3 py-2 text-xs"
                >
                  {copiedField === "phone" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-[var(--muted)]">Exact address</p>
                <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{exactAddress}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void copyValue("address", exactAddress);
                }}
                className="pill-button pill-button-light min-h-0 shrink-0 px-3 py-2 text-xs"
              >
                {copiedField === "address" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-[rgba(0,237,100,0.2)] bg-[rgba(0,237,100,0.06)] px-4 py-4 text-sm leading-7 text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">Watermarked access</p>
            <p className="mt-2">
              This unlock is tied to your account and recorded in the audit trail. Sensitive identity documents remain
              hidden even after payment.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="pill-button pill-button-light">
              Buyer workspace
            </Link>
            <Link href={`/listings/${listingId}#availability-chat`} className="pill-button pill-button-light">
              Ask follow-up
            </Link>
          </div>

          {message ? (
            <div className="rounded-[1.15rem] border border-[rgba(0,237,100,0.22)] bg-[rgba(0,237,100,0.06)] px-4 py-3 text-sm text-[var(--primary)]">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-[1.15rem] border border-[rgba(240,68,68,0.22)] bg-[rgba(240,68,68,0.08)] px-4 py-3 text-sm text-[#b03030]">
              {error}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="dark-card px-6 py-6">
      {paymentStatus ? (
        <div className="mb-4">
          <PaymentReturnNotice status={paymentStatus} reference={paymentReference} subject="Listing contact unlock" />
        </div>
      ) : null}
      <p className="eyebrow text-[var(--primary-light)]">Locked contact panel</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl text-white">
        Owner contact stays private until unlock.
      </h2>
      <p className="mt-3 text-sm leading-7 text-[rgba(232,237,235,0.8)]">
        Buyers can browse everything needed to decide, but direct phone numbers, exact addresses, and caretaker details
        stay hidden until payment settles.
      </p>

      <div className="mt-5 space-y-3 rounded-[1.5rem] border border-[rgba(184,196,194,0.12)] bg-[rgba(255,255,255,0.04)] p-4 text-sm leading-6 text-[rgba(232,237,235,0.82)]">
        <div className="flex items-center justify-between gap-3">
          <span>Owner full name</span>
          <span className="font-[var(--font-code)] uppercase tracking-[0.22em] text-[rgba(232,237,235,0.58)] blur-[2px]">
            verified owner
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Phone number</span>
          <span className="font-[var(--font-code)] uppercase tracking-[0.22em] text-[rgba(232,237,235,0.58)] blur-[2px]">
            +250 xxx xxx xxx
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Exact address / UPI</span>
          <span className="font-[var(--font-code)] uppercase tracking-[0.22em] text-[rgba(232,237,235,0.58)] blur-[2px]">
            street / map pin
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[rgba(184,196,194,0.12)] bg-[rgba(255,255,255,0.04)] p-4 text-sm leading-7 text-[rgba(232,237,235,0.82)]">
        <p className="font-semibold text-white">What payment unlocks</p>
        <ul className="mt-3 space-y-2">
          <li>- Owner full name and direct phone number</li>
          <li>- Exact address details and map-ready location data</li>
          <li>- Any designated keys manager or caretaker contact</li>
        </ul>
        <p className="mt-4 font-semibold text-white">What stays hidden</p>
        <ul className="mt-3 space-y-2">
          <li>- National ID and passport details</li>
          <li>- Ownership proof and personal files</li>
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {signedIn ? (
          <button
            type="button"
            onClick={() => {
              void handleUnlock();
            }}
            disabled={isUnlocking}
            className={`pill-button ${
              isUnlocking ? "cursor-not-allowed border border-[var(--dark-border)] bg-[var(--dark-border)] text-[rgba(232,237,235,0.66)]" : "pill-button-primary"
            }`}
          >
            {isUnlocking
              ? "Preparing checkout..."
              : tokenFeeEnabled && tokenFeeRwf
                ? `Pay ${formatRwf(tokenFeeRwf)} to unlock`
                : "Unlock details"}
          </button>
        ) : (
          <Link href={`/sign-in?next=/listings/${listingId}`} className="pill-button pill-button-primary">
            Sign in to unlock
          </Link>
        )}
        <Link href="/dashboard" className="pill-button pill-button-outline">
          Buyer workspace
        </Link>
      </div>
      <p className="mt-4 text-sm leading-7 text-[rgba(232,237,235,0.76)]">
        18% VAT inclusive. Non-refundable. Contact visibility is granted only after the payment record moves to a
        confirmed state.
      </p>
      {message ? (
        <div className="mt-4 rounded-[1.15rem] border border-[rgba(0,237,100,0.22)] bg-[rgba(0,237,100,0.08)] px-4 py-3 text-sm text-[var(--primary-light)]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-[1.15rem] border border-[rgba(240,68,68,0.22)] bg-[rgba(240,68,68,0.08)] px-4 py-3 text-sm text-[#ffb0b0]">
          {error}
        </div>
      ) : null}
    </section>
  );
}
