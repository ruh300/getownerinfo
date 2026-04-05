import type {
  FeeSettingsDocument,
  ListingCategory,
  ListingModel,
  ListingTokenFeeMatrix,
  SeekerPostFeeByDuration,
  SeekerRequestDurationDays,
  SeekerRequestDurationKey,
} from "@/lib/domain";
import { listingCategories, listingModels } from "@/lib/domain";
import { getCollection } from "@/lib/data/collections";
import {
  getSeekerPostFeeRwf as getDefaultSeekerPostFeeRwf,
  seekerViewTokenFeeRwf as defaultSeekerViewTokenFeeRwf,
} from "@/lib/seeker-requests/pricing";

export type FeeSettingsSummary = {
  listingTokenFeeMatrix: ListingTokenFeeMatrix;
  seekerPostFeeByDuration: SeekerPostFeeByDuration;
  seekerViewTokenFeeRwf: number;
  saleCommissionRateBpsByCategory: FeeSettingsDocument["saleCommissionRateBpsByCategory"];
  rentalCommissionMonthsEquivalent: number;
  commissionDueDays: number;
  penaltyPercentageBps: number;
  penaltyFixedAmountRwf: number;
  penaltyDueDays: number;
};

const feeSettingsKey: FeeSettingsDocument["key"] = "default";
const defaultListingTokenFeeRwf = 10_000;

function createDefaultListingTokenFeeMatrix(): ListingTokenFeeMatrix {
  return Object.fromEntries(
    listingCategories.map((category) => [
      category,
      Object.fromEntries(listingModels.map((model) => [model, defaultListingTokenFeeRwf])) as Record<ListingModel, number>,
    ]),
  ) as ListingTokenFeeMatrix;
}

function createDefaultSeekerPostFeeByDuration(): SeekerPostFeeByDuration {
  return {
    "7": getDefaultSeekerPostFeeRwf(7),
    "14": getDefaultSeekerPostFeeRwf(14),
    "30": getDefaultSeekerPostFeeRwf(30),
  };
}

function createDefaultSaleCommissionRateBpsByCategory(): FeeSettingsDocument["saleCommissionRateBpsByCategory"] {
  return {
    real_estate_rent: 0,
    real_estate_sale: 500,
    vehicles_for_sale: 400,
    vehicle_resellers: 250,
    furniture: 500,
    made_in_rwanda: 500,
    home_appliances: 500,
    business_industry: 400,
  };
}

export function getDefaultFeeSettings(): FeeSettingsSummary {
  return {
    listingTokenFeeMatrix: createDefaultListingTokenFeeMatrix(),
    seekerPostFeeByDuration: createDefaultSeekerPostFeeByDuration(),
    seekerViewTokenFeeRwf: defaultSeekerViewTokenFeeRwf,
    saleCommissionRateBpsByCategory: createDefaultSaleCommissionRateBpsByCategory(),
    rentalCommissionMonthsEquivalent: 1,
    commissionDueDays: 14,
    penaltyPercentageBps: 5_000,
    penaltyFixedAmountRwf: 100_000,
    penaltyDueDays: 14,
  };
}

function normalizeCurrencyAmount(value: unknown, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole-number Rwandan franc amount.`);
  }

  return parsed;
}

function normalizeListingTokenFeeMatrix(value: unknown): ListingTokenFeeMatrix {
  const defaults = createDefaultListingTokenFeeMatrix();

  if (typeof value !== "object" || value === null) {
    return defaults;
  }

  const candidate = value as Record<string, unknown>;

  return Object.fromEntries(
    listingCategories.map((category) => {
      const categoryValue =
        typeof candidate[category] === "object" && candidate[category] !== null
          ? (candidate[category] as Record<string, unknown>)
          : {};

      const row = Object.fromEntries(
        listingModels.map((model) => [
          model,
          normalizeCurrencyAmount(categoryValue[model] ?? defaults[category][model], `${category} ${model} token fee`),
        ]),
      ) as Record<ListingModel, number>;

      return [category, row];
    }),
  ) as ListingTokenFeeMatrix;
}

function normalizeSeekerPostFeeByDuration(value: unknown): SeekerPostFeeByDuration {
  const defaults = createDefaultSeekerPostFeeByDuration();

  if (typeof value !== "object" || value === null) {
    return defaults;
  }

  const candidate = value as Record<string, unknown>;

  return {
    "7": normalizeCurrencyAmount(candidate["7"] ?? defaults["7"], "7-day seeker post fee"),
    "14": normalizeCurrencyAmount(candidate["14"] ?? defaults["14"], "14-day seeker post fee"),
    "30": normalizeCurrencyAmount(candidate["30"] ?? defaults["30"], "30-day seeker post fee"),
  };
}

function normalizeSaleCommissionRateBpsByCategory(
  value: unknown,
): FeeSettingsDocument["saleCommissionRateBpsByCategory"] {
  const defaults = createDefaultSaleCommissionRateBpsByCategory();

  if (typeof value !== "object" || value === null) {
    return defaults;
  }

  const candidate = value as Record<string, unknown>;

  return Object.fromEntries(
    listingCategories.map((category) => [
      category,
      normalizeCurrencyAmount(
        candidate[category] ?? defaults[category],
        `${category} sale commission rate`,
      ),
    ]),
  ) as FeeSettingsDocument["saleCommissionRateBpsByCategory"];
}

function normalizePositiveWholeNumber(value: unknown, label: string, minimum = 1) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < minimum || !Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number greater than or equal to ${minimum}.`);
  }

  return parsed;
}

function serializeFeeSettings(document: FeeSettingsDocument | null | undefined): FeeSettingsSummary {
  const defaults = getDefaultFeeSettings();

  return {
    listingTokenFeeMatrix: document?.listingTokenFeeMatrix ?? defaults.listingTokenFeeMatrix,
    seekerPostFeeByDuration: document?.seekerPostFeeByDuration ?? defaults.seekerPostFeeByDuration,
    seekerViewTokenFeeRwf: document?.seekerViewTokenFeeRwf ?? defaults.seekerViewTokenFeeRwf,
    saleCommissionRateBpsByCategory:
      document?.saleCommissionRateBpsByCategory ?? defaults.saleCommissionRateBpsByCategory,
    rentalCommissionMonthsEquivalent:
      document?.rentalCommissionMonthsEquivalent ?? defaults.rentalCommissionMonthsEquivalent,
    commissionDueDays: document?.commissionDueDays ?? defaults.commissionDueDays,
    penaltyPercentageBps: document?.penaltyPercentageBps ?? defaults.penaltyPercentageBps,
    penaltyFixedAmountRwf: document?.penaltyFixedAmountRwf ?? defaults.penaltyFixedAmountRwf,
    penaltyDueDays: document?.penaltyDueDays ?? defaults.penaltyDueDays,
  };
}

export async function getFeeSettingsSummary(): Promise<FeeSettingsSummary> {
  const feeSettings = await getCollection("feeSettings");
  const document = await feeSettings.findOne({
    key: feeSettingsKey,
  });

  return serializeFeeSettings(document);
}

export async function upsertFeeSettings(input: FeeSettingsSummary) {
  const feeSettings = await getCollection("feeSettings");
  const now = new Date();
  const normalized: FeeSettingsSummary = {
    listingTokenFeeMatrix: normalizeListingTokenFeeMatrix(input.listingTokenFeeMatrix),
    seekerPostFeeByDuration: normalizeSeekerPostFeeByDuration(input.seekerPostFeeByDuration),
    seekerViewTokenFeeRwf: normalizeCurrencyAmount(input.seekerViewTokenFeeRwf, "Seeker view token fee"),
    saleCommissionRateBpsByCategory: normalizeSaleCommissionRateBpsByCategory(
      input.saleCommissionRateBpsByCategory,
    ),
    rentalCommissionMonthsEquivalent: normalizePositiveWholeNumber(
      input.rentalCommissionMonthsEquivalent,
      "Rental commission months equivalent",
    ),
    commissionDueDays: normalizePositiveWholeNumber(input.commissionDueDays, "Commission due days"),
    penaltyPercentageBps: normalizeCurrencyAmount(input.penaltyPercentageBps, "Penalty percentage basis points"),
    penaltyFixedAmountRwf: normalizeCurrencyAmount(input.penaltyFixedAmountRwf, "Penalty fixed amount"),
    penaltyDueDays: normalizePositiveWholeNumber(input.penaltyDueDays, "Penalty due days"),
  };
  const result = await feeSettings.findOneAndUpdate(
    {
      key: feeSettingsKey,
    },
    {
      $set: {
        key: feeSettingsKey,
        ...normalized,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    },
  );

  if (!result) {
    throw new Error("Could not save fee settings.");
  }

  return serializeFeeSettings(result);
}

export function resolveListingTokenFeeRwf(
  settings: FeeSettingsSummary,
  category: ListingCategory,
  model: ListingModel,
) {
  return settings.listingTokenFeeMatrix[category][model];
}

export function resolveSeekerPostFeeRwf(
  settings: FeeSettingsSummary,
  durationDays: SeekerRequestDurationDays,
) {
  return settings.seekerPostFeeByDuration[String(durationDays) as SeekerRequestDurationKey];
}

export function resolveSeekerViewTokenFeeRwf(settings: FeeSettingsSummary) {
  return settings.seekerViewTokenFeeRwf;
}

export function resolveSaleCommissionRateBps(
  settings: FeeSettingsSummary,
  category: ListingCategory,
) {
  return settings.saleCommissionRateBpsByCategory[category];
}

export function resolveRentalCommissionMonthsEquivalent(settings: FeeSettingsSummary) {
  return settings.rentalCommissionMonthsEquivalent;
}

export function resolveCommissionDueDays(settings: FeeSettingsSummary) {
  return settings.commissionDueDays;
}

export function resolvePenaltyPercentageBps(settings: FeeSettingsSummary) {
  return settings.penaltyPercentageBps;
}

export function resolvePenaltyFixedAmountRwf(settings: FeeSettingsSummary) {
  return settings.penaltyFixedAmountRwf;
}

export function resolvePenaltyDueDays(settings: FeeSettingsSummary) {
  return settings.penaltyDueDays;
}
