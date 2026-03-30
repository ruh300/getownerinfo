"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PaymentReturnNotice } from "@/components/payments/payment-return-notice";
import { formatRwf } from "@/lib/formatting/currency";
import type { PaymentReturnStatus } from "@/lib/payments/search-params";

type UnlockSeekerContactPanelProps = {
  requestId: string;
  tokenFeeRwf: number;
  signedIn: boolean;
  canUnlock: boolean;
  initiallyUnlocked: boolean;
  paymentStatus?: PaymentReturnStatus | null;
  paymentReference?: string | null;
};

export function UnlockSeekerContactPanel({
  requestId,
  tokenFeeRwf,
  signedIn,
  canUnlock,
  initiallyUnlocked,
  paymentStatus,
  paymentReference,
}: UnlockSeekerContactPanelProps) {
  const router = useRouter();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);

  async function handleUnlock() {
    setMessage(null);
    setError(null);
    setIsUnlocking(true);

    try {
      const response = await fetch(`/api/seeker-requests/${requestId}/unlock`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        message?: string;
        reused?: boolean;
        unlocked?: boolean;
        checkoutUrl?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not unlock the seeker request.");
      }

      if (payload.unlocked) {
        setUnlocked(true);
        setMessage(payload.reused ? "This seeker request was already unlocked in your account." : "Seeker contact details unlocked for this account.");
        router.refresh();
        return;
      }

      if (payload.checkoutUrl) {
        setMessage("Checkout created. Redirecting to the payment confirmation screen...");
        window.location.assign(payload.checkoutUrl);
        return;
      }

      throw new Error("A payment checkout could not be created for this seeker request.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not unlock the seeker request.");
    } finally {
      setIsUnlocking(false);
    }
  }

  if (unlocked) {
    return (
      <section className="rounded-[28px] border border-[rgba(26,122,74,0.24)] bg-[linear-gradient(180deg,#edfaf3,#f7fffb)] p-6 shadow-[0_20px_50px_rgba(26,122,74,0.12)]">
        {paymentStatus === "paid" ? (
          <div className="mb-4">
            <PaymentReturnNotice status={paymentStatus} reference={paymentReference} subject="Seeker contact unlock" />
          </div>
        ) : null}
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Access unlocked</p>
        <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--foreground)]">Seeker contact details are now visible.</h2>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          The detail page now reveals the seeker name, phone number, preferred contact time, and full request details after the payment settles.
        </p>
        {message ? (
          <div className="mt-4 rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">
            {message}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[rgba(200,134,10,0.24)] bg-[linear-gradient(180deg,#fff8ec,#fff4db)] p-6 shadow-[0_20px_50px_rgba(200,134,10,0.12)]">
      {paymentStatus ? (
        <div className="mb-4">
          <PaymentReturnNotice status={paymentStatus} reference={paymentReference} subject="Seeker contact unlock" />
        </div>
      ) : null}
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Locked seeker contact</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--foreground)]">Full seeker details stay private until unlock.</h2>
      <div className="mt-5 space-y-3 rounded-[24px] border border-[rgba(200,134,10,0.2)] bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
        <div className="flex items-center justify-between gap-3">
          <span>Seeker full name</span>
          <span className="font-semibold tracking-[0.14em] text-[var(--accent)]">LOCKED</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Phone number</span>
          <span className="font-semibold tracking-[0.14em] text-[var(--accent)]">LOCKED</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Preferred contact time</span>
          <span className="font-semibold tracking-[0.14em] text-[var(--accent)]">LOCKED</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Full request details</span>
          <span className="font-semibold tracking-[0.14em] text-[var(--accent)]">LOCKED</span>
        </div>
      </div>
      <div className="mt-5 rounded-[24px] bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
        <p className="font-semibold text-[var(--foreground)]">What the unlock will reveal</p>
        <ul className="mt-3 space-y-2">
          <li>- Seeker full name and direct phone number</li>
          <li>- Preferred contact time for outreach</li>
          <li>- Full requirement details beyond the public summary</li>
        </ul>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {signedIn ? (
          canUnlock ? (
            <button
              type="button"
              onClick={() => {
                void handleUnlock();
              }}
              disabled={isUnlocking}
              className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
                isUnlocking ? "cursor-not-allowed bg-[rgba(200,134,10,0.45)]" : "bg-[var(--accent)] hover:bg-[#a06b08]"
              }`}
            >
              {isUnlocking ? "Preparing checkout..." : `Pay ${formatRwf(tokenFeeRwf)} to unlock`}
            </button>
          ) : (
            <div className="rounded-full border border-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              Buyer accounts cannot unlock seeker contact
            </div>
          )
        ) : (
          <Link
            href={`/sign-in?next=/seeker-requests/${requestId}`}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#a06b08]"
          >
            Sign in to unlock
          </Link>
        )}
        <Link
          href="/seeker-requests"
          className="rounded-full border border-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:bg-[rgba(200,134,10,0.08)]"
        >
          Back to board
        </Link>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
        This now creates a pending checkout first, then grants seeker access only after the payment is confirmed.
      </p>
      {message ? (
        <div className="mt-4 rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">
          {error}
        </div>
      ) : null}
    </section>
  );
}
