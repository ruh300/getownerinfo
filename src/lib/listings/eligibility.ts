import { formatRwf } from "@/lib/formatting/currency";
import { type ListingCategory, type ListingModel } from "@/lib/domain";

const forcedModelBCategories = new Set<ListingCategory>(["vehicle_resellers"]);

const modelAThresholds: Record<Exclude<ListingCategory, "vehicle_resellers">, number> = {
  real_estate_rent: 1_500_000,
  real_estate_sale: 50_000_000,
  vehicles_for_sale: 10_000_000,
  furniture: 3_000_000,
  made_in_rwanda: 3_000_000,
  home_appliances: 3_000_000,
  business_industry: 3_000_000,
};

export type ComputeListingEligibilityInput = {
  category: ListingCategory;
  units: number;
  priceRwf: number;
  requestedModel?: ListingModel | null;
};

export type ListingEligibilityResult = {
  eligibleForModelA: boolean;
  forcedModelB: boolean;
  thresholdRwf: number | null;
  reasons: string[];
  selectedModel: ListingModel;
  canChooseModelA: boolean;
};

export function computeListingEligibility({
  category,
  units,
  priceRwf,
  requestedModel,
}: ComputeListingEligibilityInput): ListingEligibilityResult {
  const reasons: string[] = [];
  const forcedModelB = forcedModelBCategories.has(category) || units > 1;

  if (forcedModelBCategories.has(category)) {
    reasons.push("This category is always Model B.");
  }

  if (units > 1) {
    reasons.push("Multiple units force Model B.");
  }

  const thresholdRwf = category === "vehicle_resellers" ? null : modelAThresholds[category];
  const meetsThreshold = thresholdRwf !== null ? priceRwf >= thresholdRwf : false;

  if (thresholdRwf !== null) {
    if (meetsThreshold) {
      reasons.push(`Price meets the Model A threshold of ${formatRwf(thresholdRwf)}.`);
    } else {
      reasons.push(`Price is below the Model A threshold of ${formatRwf(thresholdRwf)}.`);
    }
  }

  const eligibleForModelA = !forcedModelB && meetsThreshold;

  if (!eligibleForModelA && reasons.length === 0) {
    reasons.push("Model B is the safe default for this listing.");
  }

  const selectedModel: ListingModel =
    eligibleForModelA && requestedModel === "A"
      ? "A"
      : eligibleForModelA && requestedModel === "B"
        ? "B"
        : eligibleForModelA
          ? "B"
          : "B";

  return {
    eligibleForModelA,
    forcedModelB,
    thresholdRwf,
    reasons,
    selectedModel,
    canChooseModelA: eligibleForModelA,
  };
}

