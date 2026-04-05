"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { listingCategories, listingModels, type ListingCategory, type ListingModel } from "@/lib/domain";
import { formatRwf } from "@/lib/formatting/currency";
import { getCategoryLabel } from "@/lib/formatting/text";
import type { FeeSettingsSummary } from "@/lib/fee-settings/workflow";

type FeeSettingsPanelProps = {
  settings: FeeSettingsSummary;
  canEdit: boolean;
};

function cloneSettings(settings: FeeSettingsSummary): FeeSettingsSummary {
  return {
    listingTokenFeeMatrix: Object.fromEntries(
      listingCategories.map((category) => [
        category,
        Object.fromEntries(listingModels.map((model) => [model, settings.listingTokenFeeMatrix[category][model]])) as Record<
          ListingModel,
          number
        >,
      ]),
    ) as FeeSettingsSummary["listingTokenFeeMatrix"],
    seekerPostFeeByDuration: { ...settings.seekerPostFeeByDuration },
    seekerViewTokenFeeRwf: settings.seekerViewTokenFeeRwf,
    saleCommissionRateBpsByCategory: { ...settings.saleCommissionRateBpsByCategory },
    rentalCommissionMonthsEquivalent: settings.rentalCommissionMonthsEquivalent,
    commissionDueDays: settings.commissionDueDays,
    penaltyPercentageBps: settings.penaltyPercentageBps,
    penaltyFixedAmountRwf: settings.penaltyFixedAmountRwf,
    penaltyDueDays: settings.penaltyDueDays,
  };
}

export function FeeSettingsPanel({ settings, canEdit }: FeeSettingsPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<FeeSettingsSummary>(() => cloneSettings(settings));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateListingFee(category: ListingCategory, model: ListingModel, amount: string) {
    const nextValue = Number(amount);

    setDraft((current) => ({
      ...current,
      listingTokenFeeMatrix: {
        ...current.listingTokenFeeMatrix,
        [category]: {
          ...current.listingTokenFeeMatrix[category],
          [model]: Number.isFinite(nextValue) ? Math.max(0, Math.round(nextValue)) : 0,
        },
      },
    }));
  }

  function updateSeekerPostFee(duration: "7" | "14" | "30", amount: string) {
    const nextValue = Number(amount);

    setDraft((current) => ({
      ...current,
      seekerPostFeeByDuration: {
        ...current.seekerPostFeeByDuration,
        [duration]: Number.isFinite(nextValue) ? Math.max(0, Math.round(nextValue)) : 0,
      },
    }));
  }

  function updateSaleCommissionRate(category: ListingCategory, amount: string) {
    const nextValue = Number(amount);

    setDraft((current) => ({
      ...current,
      saleCommissionRateBpsByCategory: {
        ...current.saleCommissionRateBpsByCategory,
        [category]: Number.isFinite(nextValue) ? Math.max(0, Math.round(nextValue)) : 0,
      },
    }));
  }

  async function handleSave() {
    setMessage(null);
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/fee-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as { message?: string; settings?: FeeSettingsSummary };

      if (!response.ok || !payload.settings) {
        throw new Error(payload.message ?? "Could not save fee settings.");
      }

      setDraft(cloneSettings(payload.settings));
      setMessage("Fee settings saved. New values apply to new drafts, seeker posts, and fallback fee displays.");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save fee settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Fee settings</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl">Platform fee controls</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Configure the current prototype fee matrix for listing unlocks, seeker workflows, and Model A commission invoices. Currency amounts are stored in Rwandan francs and commission sale rates are stored in basis points.
        </p>
      </div>

      <section className="space-y-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Listing unlock matrix</p>
            <h3 className="mt-2 font-[var(--font-display)] text-3xl">Buyer token fees by category and model</h3>
          </div>
          {!canEdit ? (
            <div className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Read-only for managers
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {listingCategories.map((category) => (
            <article key={category} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
              <p className="font-semibold text-[var(--foreground)]">{getCategoryLabel(category)}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {listingModels.map((model) => (
                  <label key={model} className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">
                      Model {model}
                    </span>
                    <input
                      type="number"
                      min="0"
                      disabled={!canEdit || isSaving}
                      value={draft.listingTokenFeeMatrix[category][model]}
                      onChange={(event) => updateListingFee(category, model, event.target.value)}
                      className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
                    />
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Seeker posting fees</p>
          <h3 className="mt-2 font-[var(--font-display)] text-3xl">Demand board pricing</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(["7", "14", "30"] as const).map((duration) => (
              <label key={duration} className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">
                  {duration} days
                </span>
                <input
                  type="number"
                  min="0"
                  disabled={!canEdit || isSaving}
                  value={draft.seekerPostFeeByDuration[duration]}
                  onChange={(event) => updateSeekerPostFee(duration, event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
                />
              </label>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Seeker unlock token</p>
          <h3 className="mt-2 font-[var(--font-display)] text-3xl">Owner-side contact unlock</h3>
          <label className="mt-5 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">View token fee</span>
            <input
              type="number"
              min="0"
              disabled={!canEdit || isSaving}
              value={draft.seekerViewTokenFeeRwf}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  seekerViewTokenFeeRwf: Math.max(0, Math.round(Number(event.target.value) || 0)),
                }))
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
            />
          </label>
          <div className="mt-5 rounded-[24px] bg-[var(--surface-alt)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            <p>Current seeker unlock fee: {formatRwf(draft.seekerViewTokenFeeRwf)}</p>
            <p className="mt-2">Changes apply to new seeker posts and new unlock actions. Existing payment records remain untouched.</p>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Model A commissions</p>
          <h3 className="mt-2 font-[var(--font-display)] text-3xl">Sale commission rates by category</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            These basis-point rates are applied when a Model A listing is marked sold. Example: <span className="font-semibold text-[var(--foreground)]">500 bps = 5%</span>.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {listingCategories.map((category) => (
              <label key={category} className="space-y-2 rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                <span className="text-sm font-semibold text-[var(--foreground)]">{getCategoryLabel(category)}</span>
                <input
                  type="number"
                  min="0"
                  disabled={!canEdit || isSaving}
                  value={draft.saleCommissionRateBpsByCategory[category]}
                  onChange={(event) => updateSaleCommissionRate(category, event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
                />
              </label>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Invoice timing</p>
          <h3 className="mt-2 font-[var(--font-display)] text-3xl">Rental commission and due date</h3>
          <div className="mt-5 grid gap-4">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">
                Rental commission months equivalent
              </span>
              <input
                type="number"
                min="1"
                disabled={!canEdit || isSaving}
                value={draft.rentalCommissionMonthsEquivalent}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    rentalCommissionMonthsEquivalent: Math.max(1, Math.round(Number(event.target.value) || 1)),
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">
                Commission due days
              </span>
              <input
                type="number"
                min="1"
                disabled={!canEdit || isSaving}
                value={draft.commissionDueDays}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    commissionDueDays: Math.max(1, Math.round(Number(event.target.value) || 1)),
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
              />
            </label>
          </div>
          <div className="mt-5 rounded-[24px] bg-[var(--surface-alt)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            <p>Rental commission currently uses {draft.rentalCommissionMonthsEquivalent} month(s) of the reported rent.</p>
            <p className="mt-2">Generated commission invoices are due {draft.commissionDueDays} day(s) after the owner reports a sold or rented outcome.</p>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Penalty defaults</p>
          <h3 className="mt-2 font-[var(--font-display)] text-3xl">System penalty formula</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            These settings power automatic penalty amounts when the platform confirms overdue commission or other enforced violations.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">
                Penalty percentage basis points
              </span>
              <input
                type="number"
                min="0"
                disabled={!canEdit || isSaving}
                value={draft.penaltyPercentageBps}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    penaltyPercentageBps: Math.max(0, Math.round(Number(event.target.value) || 0)),
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">
                Penalty fixed amount
              </span>
              <input
                type="number"
                min="0"
                disabled={!canEdit || isSaving}
                value={draft.penaltyFixedAmountRwf}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    penaltyFixedAmountRwf: Math.max(0, Math.round(Number(event.target.value) || 0)),
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
              />
            </label>
          </div>
        </article>

        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Penalty timing</p>
          <h3 className="mt-2 font-[var(--font-display)] text-3xl">Due-date controls</h3>
          <label className="mt-5 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-light)]">Penalty due days</span>
            <input
              type="number"
              min="1"
              disabled={!canEdit || isSaving}
              value={draft.penaltyDueDays}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  penaltyDueDays: Math.max(1, Math.round(Number(event.target.value) || 1)),
                }))
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[rgba(0,0,0,0.03)]"
            />
          </label>
          <div className="mt-5 rounded-[24px] bg-[var(--surface-alt)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            <p>
              Current default formula: {draft.penaltyPercentageBps / 100}% of the base amount + {formatRwf(draft.penaltyFixedAmountRwf)}.
            </p>
            <p className="mt-2">New penalty invoices are due {draft.penaltyDueDays} day(s) after they are assessed.</p>
          </div>
        </article>
      </section>

      <div className="flex flex-wrap gap-3">
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving}
            className={`rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
              isSaving ? "cursor-not-allowed bg-[rgba(26,77,46,0.45)]" : "bg-[var(--primary)] hover:bg-[var(--primary-light)]"
            }`}
          >
            {isSaving ? "Saving..." : "Save fee settings"}
          </button>
        ) : (
          <div className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Managers can review but not change these values
          </div>
        )}
        <div className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Values are VAT-inclusive where applicable. Commission invoices stay system-generated and non-editable by owners.
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[rgba(26,122,74,0.24)] bg-[rgba(26,122,74,0.08)] px-4 py-3 text-sm text-[var(--primary)]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">
          {error}
        </div>
      ) : null}
    </section>
  );
}
