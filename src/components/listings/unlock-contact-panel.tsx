"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatRwf } from "@/lib/formatting/currency";

type UnlockContactPanelProps = {
  listingId: string;
  tokenFeeEnabled: boolean;
  tokenFeeRwf?: number;
  ownerName: string;
  ownerPhone: string;
  exactAddress: string;
  signedIn: boolean;
  initiallyUnlocked: boolean;
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
}: UnlockContactPanelProps) {
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
      const response = await fetch(`/api/listings/${listingId}/unlock`, {
        method: "POST",
      });
      const payload = (await response.json()) as { message?: string; reused?: boolean };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not unlock the listing.");
      }

      setUnlocked(true);
      setMessage(payload.reused ? "This listing was already unlocked in your account." : "Listing contact details unlocked for this account.");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not unlock the listing.");
    } finally {
      setIsUnlocking(false);
    }
  }

  if (unlocked) {
    return (
      <section className="rounded-[28px] border border-[rgba(26,122,74,0.24)] bg-[linear-gradient(180deg,#edfaf3,#f7fffb)] p-6 shadow-[0_20px_50px_rgba(26,122,74,0.12)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Access unlocked</p>
        <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--foreground)]">Direct owner details are now visible.</h2>
        <div className="mt-5 space-y-3 rounded-[24px] border border-[rgba(26,122,74,0.18)] bg-white/80 p-4 text-sm leading-6 text-[var(--foreground)]">
          <div className="flex items-center justify-between gap-3">
            <span>Owner full name</span>
            <span className="font-semibold">{ownerName}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Phone number</span>
            <span className="font-semibold">{ownerPhone}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span>Exact address</span>
            <span className="max-w-[14rem] text-right font-semibold">{exactAddress}</span>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          This is the prototype unlock flow. The immutable unlock record is already stored; the real AfrIPay payment step will plug into the same access path.
        </p>
        {message ? <div className="mt-4 rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">{message}</div> : null}
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[rgba(200,134,10,0.24)] bg-[linear-gradient(180deg,#fff8ec,#fff4db)] p-6 shadow-[0_20px_50px_rgba(200,134,10,0.12)]">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Locked contact panel</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--foreground)]">Owner contact stays private until unlock.</h2>
      <div className="mt-5 space-y-3 rounded-[24px] border border-[rgba(200,134,10,0.2)] bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
        <div className="flex items-center justify-between gap-3">
          <span>Owner full name</span>
          <span className="font-semibold tracking-[0.14em] text-[var(--accent)]">LOCKED</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Phone number</span>
          <span className="font-semibold tracking-[0.14em] text-[var(--accent)]">LOCKED</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Exact address / UPI</span>
          <span className="font-semibold tracking-[0.14em] text-[var(--accent)]">LOCKED</span>
        </div>
      </div>
      <div className="mt-5 rounded-[24px] bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
        <p className="font-semibold text-[var(--foreground)]">What the token unlock will reveal</p>
        <ul className="mt-3 space-y-2">
          <li>- Owner full name and direct phone number</li>
          <li>- Exact address details and map-ready location data</li>
          <li>- Any designated keys manager or caretaker contact</li>
        </ul>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {signedIn ? (
          <button
            type="button"
            onClick={() => { void handleUnlock(); }}
            disabled={isUnlocking}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
              isUnlocking ? "cursor-not-allowed bg-[rgba(200,134,10,0.45)]" : "bg-[var(--accent)] hover:bg-[#a06b08]"
            }`}
          >
            {isUnlocking
              ? "Unlocking..."
              : tokenFeeEnabled && tokenFeeRwf
                ? `Prototype unlock for ${formatRwf(tokenFeeRwf)}`
                : "Prototype unlock"}
          </button>
        ) : (
          <Link
            href={`/sign-in?next=/listings/${listingId}`}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#a06b08]"
          >
            Sign in to unlock
          </Link>
        )}
        <Link
          href="/dashboard"
          className="rounded-full border border-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:bg-[rgba(200,134,10,0.08)]"
        >
          Buyer workspace
        </Link>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
        Payment is still in prototype mode, so this button simulates the serious-buyer unlock step while preserving the immutable audit record.
      </p>
      {message ? <div className="mt-4 rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">{message}</div> : null}
      {error ? <div className="mt-4 rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">{error}</div> : null}
    </section>
  );
}
