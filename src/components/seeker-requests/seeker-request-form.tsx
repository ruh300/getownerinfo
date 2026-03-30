"use client";

import { useEffect, useState, useTransition } from "react";

import { listingCategories, seekerRequestDurations, type ListingCategory, type SeekerRequestDurationDays } from "@/lib/domain";
import type { FeeSettingsSummary } from "@/lib/fee-settings/workflow";
import { formatRwf } from "@/lib/formatting/currency";
import { getCategoryLabel } from "@/lib/formatting/text";

type CreateSeekerRequestResponse = {
  status: "ok" | "error";
  message?: string;
  errors?: string[];
  checkoutUrl?: string | null;
  paymentReference?: string;
  reused?: boolean;
};

type SeekerRequestDraftState = {
  category: ListingCategory;
  title: string;
  details: string;
  budgetMinRwf: string;
  budgetMaxRwf: string;
  quantityLabel: string;
  approximateAreaLabel: string;
  district: string;
  sector: string;
  preferredContactTime: string;
  durationDays: SeekerRequestDurationDays;
};

const draftStorageKey = "getownerinfo:seeker-request-draft";

export function SeekerRequestForm({ feeSettings }: { feeSettings: FeeSettingsSummary }) {
  const [category, setCategory] = useState<ListingCategory>("real_estate_rent");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [budgetMinRwf, setBudgetMinRwf] = useState("");
  const [budgetMaxRwf, setBudgetMaxRwf] = useState("");
  const [quantityLabel, setQuantityLabel] = useState("");
  const [approximateAreaLabel, setApproximateAreaLabel] = useState("");
  const [district, setDistrict] = useState("");
  const [sector, setSector] = useState("");
  const [preferredContactTime, setPreferredContactTime] = useState("");
  const [durationDays, setDurationDays] = useState<SeekerRequestDurationDays>(14);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [isPending, startTransition] = useTransition();
  const postFeeRwf = feeSettings.seekerPostFeeByDuration[String(durationDays) as keyof FeeSettingsSummary["seekerPostFeeByDuration"]];

  useEffect(() => {
    try {
      const storedDraft = window.localStorage.getItem(draftStorageKey);

      if (!storedDraft) {
        return;
      }

      const draft = JSON.parse(storedDraft) as Partial<SeekerRequestDraftState>;

      if (draft.category && listingCategories.includes(draft.category)) {
        setCategory(draft.category);
      }

      if (typeof draft.title === "string") {
        setTitle(draft.title);
      }

      if (typeof draft.details === "string") {
        setDetails(draft.details);
      }

      if (typeof draft.budgetMinRwf === "string") {
        setBudgetMinRwf(draft.budgetMinRwf);
      }

      if (typeof draft.budgetMaxRwf === "string") {
        setBudgetMaxRwf(draft.budgetMaxRwf);
      }

      if (typeof draft.quantityLabel === "string") {
        setQuantityLabel(draft.quantityLabel);
      }

      if (typeof draft.approximateAreaLabel === "string") {
        setApproximateAreaLabel(draft.approximateAreaLabel);
      }

      if (typeof draft.district === "string") {
        setDistrict(draft.district);
      }

      if (typeof draft.sector === "string") {
        setSector(draft.sector);
      }

      if (typeof draft.preferredContactTime === "string") {
        setPreferredContactTime(draft.preferredContactTime);
      }

      if (draft.durationDays && seekerRequestDurations.includes(draft.durationDays)) {
        setDurationDays(draft.durationDays);
      }
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    } finally {
      setHasHydratedDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedDraft) {
      return;
    }

    const draft: SeekerRequestDraftState = {
      category,
      title,
      details,
      budgetMinRwf,
      budgetMaxRwf,
      quantityLabel,
      approximateAreaLabel,
      district,
      sector,
      preferredContactTime,
      durationDays,
    };

    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [
    approximateAreaLabel,
    budgetMaxRwf,
    budgetMinRwf,
    category,
    details,
    district,
    durationDays,
    preferredContactTime,
    quantityLabel,
    sector,
    title,
    hasHydratedDraft,
  ]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setValidationErrors([]);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/seeker-requests", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              category,
              title,
              details,
              budgetMinRwf,
              budgetMaxRwf,
              quantityLabel,
              approximateAreaLabel,
              district,
              sector,
              preferredContactTime,
              durationDays,
            }),
          });
          const payload = (await response.json()) as CreateSeekerRequestResponse;

          if (!response.ok || payload.status !== "ok") {
            setValidationErrors(payload.errors ?? []);
            throw new Error(payload.message ?? "Could not create the seeker request.");
          }

          if (payload.checkoutUrl) {
            window.location.assign(payload.checkoutUrl);
            return;
          }

          throw new Error("A payment checkout could not be created for this seeker request.");
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Could not create the seeker request.");
        }
      })();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as ListingCategory)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
          >
            {listingCategories.map((item) => (
              <option key={item} value={item}>
                {getCategoryLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Duration</span>
          <select
            value={String(durationDays)}
            onChange={(event) => setDurationDays(Number(event.target.value) as SeekerRequestDurationDays)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
          >
            {seekerRequestDurations.map((duration) => (
              <option key={duration} value={duration}>
                {duration} days
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Request title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Looking for a 3-bedroom home in Kicukiro"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Budget min</span>
          <input
            value={budgetMinRwf}
            onChange={(event) => setBudgetMinRwf(event.target.value)}
            type="number"
            min="0"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="500000"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Budget max</span>
          <input
            value={budgetMaxRwf}
            onChange={(event) => setBudgetMaxRwf(event.target.value)}
            type="number"
            min="0"
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="900000"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Quantity or type</span>
          <input
            value={quantityLabel}
            onChange={(event) => setQuantityLabel(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="1 home, 2 shops, or commercial warehouse"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Preferred contact time</span>
          <input
            value={preferredContactTime}
            onChange={(event) => setPreferredContactTime(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Weekdays after 6pm"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Approximate area</span>
          <input
            value={approximateAreaLabel}
            onChange={(event) => setApproximateAreaLabel(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Nyarutarama, near Amahoro"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">District</span>
          <input
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Gasabo"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Sector</span>
          <input
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Kimironko"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Details</span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={6}
            className="min-h-40 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Describe the condition, location priorities, move-in timing, parking, or any other requirements owners should know before responding."
          />
        </label>
      </div>

      <div className="rounded-[24px] border border-[rgba(26,77,46,0.12)] bg-[rgba(26,77,46,0.06)] p-5 text-sm leading-6 text-[var(--muted)]">
        <p className="font-semibold text-[var(--foreground)]">Prototype seeker pricing</p>
        <p className="mt-2">Posting fee for this request: {formatRwf(postFeeRwf)}</p>
        <p>Future owner view token: {formatRwf(feeSettings.seekerViewTokenFeeRwf)}</p>
        <p className="mt-2">
          Your request stays public but anonymized. Owners can see what you need, but your name and phone stay hidden.
        </p>
      </div>

      {validationErrors.length > 0 ? (
        <div className="rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">
          <ul className="space-y-1">
            {validationErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className={`w-full rounded-2xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
          isPending ? "cursor-not-allowed bg-[rgba(26,77,46,0.45)]" : "bg-[var(--primary)] hover:bg-[var(--primary-light)]"
        }`}
      >
        {isPending ? "Posting request..." : "Post seeker request"}
      </button>
    </form>
  );
}
