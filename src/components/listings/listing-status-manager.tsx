"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import type { ListingStatus } from "@/lib/domain";
import { getAllowedNextListingStatuses } from "@/lib/listings/lifecycle";
import { humanizeEnum } from "@/lib/formatting/text";

type ListingStatusManagerProps = {
  listingId: string;
  currentStatus: ListingStatus;
};

export function ListingStatusManager({ listingId, currentStatus }: ListingStatusManagerProps) {
  const router = useRouter();
  const nextStatuses = getAllowedNextListingStatuses(currentStatus);
  const [selectedStatus, setSelectedStatus] = useState<ListingStatus | "">(
    nextStatuses[0] ?? "",
  );
  const [statusNote, setStatusNote] = useState("");
  const [finalAmountRwf, setFinalAmountRwf] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsFinalAmount = selectedStatus === "sold" || selectedStatus === "rented";

  if (nextStatuses.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        This listing is already in a final lifecycle state.
      </div>
    );
  }

  async function handleSubmit() {
    if (!selectedStatus) {
      setError("Choose the next lifecycle status first.");
      return;
    }

    if (needsFinalAmount) {
      const parsedFinalAmount = Number.parseInt(finalAmountRwf, 10);

      if (!Number.isInteger(parsedFinalAmount) || parsedFinalAmount <= 0) {
        setError(`Enter the final ${selectedStatus === "sold" ? "sale" : "rent"} amount before continuing.`);
        return;
      }
    }

    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(`/api/listings/${listingId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: selectedStatus,
          statusNote,
          finalAmountRwf: needsFinalAmount ? Number.parseInt(finalAmountRwf, 10) : undefined,
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not update the listing lifecycle.");
      }

      startTransition(() => {
        router.refresh();
      });
      setStatusNote("");
      setFinalAmountRwf("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update the listing lifecycle.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">Lifecycle update</p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          Current status: {humanizeEnum(currentStatus)}
        </p>
      </div>
      <label className="block text-sm font-semibold text-[var(--foreground)]">
        Next status
        <select
          value={selectedStatus}
          onChange={(event) => {
            const nextValue = event.target.value as ListingStatus;
            setSelectedStatus(nextValue);

            if (nextValue !== "sold" && nextValue !== "rented") {
              setFinalAmountRwf("");
            }
          }}
          className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
        >
          {nextStatuses.map((status) => (
            <option key={status} value={status}>
              {humanizeEnum(status)}
            </option>
          ))}
        </select>
      </label>
      {needsFinalAmount ? (
        <label className="block text-sm font-semibold text-[var(--foreground)]">
          Final {selectedStatus === "sold" ? "sale" : "rent"} amount
          <input
            type="number"
            min="1"
            value={finalAmountRwf}
            onChange={(event) => setFinalAmountRwf(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
            placeholder="Enter the final amount in Rwf"
          />
          <span className="mt-2 block text-xs font-normal leading-5 text-[var(--muted)]">
            Model A outcomes generate a system commission invoice from this reported amount.
          </span>
        </label>
      ) : null}
      <label className="block text-sm font-semibold text-[var(--foreground)]">
        Optional note
        <textarea
          value={statusNote}
          onChange={(event) => setStatusNote(event.target.value)}
          className="mt-2 min-h-20 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
          placeholder="Add context for buyers, admins, or future follow-up."
        />
      </label>
      {error ? <p className="text-sm text-[#9c2d2d]">{error}</p> : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          void handleSubmit();
        }}
        className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
          isPending ? "cursor-not-allowed bg-[rgba(26,77,46,0.45)]" : "bg-[var(--primary)] hover:bg-[var(--primary-light)]"
        }`}
      >
        {isPending ? "Saving..." : "Update status"}
      </button>
    </div>
  );
}
