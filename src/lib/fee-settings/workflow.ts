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

export function getDefaultFeeSettings(): FeeSettingsSummary {
  return {
    listingTokenFeeMatrix: createDefaultListingTokenFeeMatrix(),
    seekerPostFeeByDuration: createDefaultSeekerPostFeeByDuration(),
    seekerViewTokenFeeRwf: defaultSeekerViewTokenFeeRwf,
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

function serializeFeeSettings(document: FeeSettingsDocument | null | undefined): FeeSettingsSummary {
  const defaults = getDefaultFeeSettings();

  return {
    listingTokenFeeMatrix: document?.listingTokenFeeMatrix ?? defaults.listingTokenFeeMatrix,
    seekerPostFeeByDuration: document?.seekerPostFeeByDuration ?? defaults.seekerPostFeeByDuration,
    seekerViewTokenFeeRwf: document?.seekerViewTokenFeeRwf ?? defaults.seekerViewTokenFeeRwf,
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
