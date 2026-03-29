import {
  listingCategories,
  listingModels,
  ownerTypes,
  type DraftOwnerContact,
  type ListingCategory,
  type ListingDraftDocument,
  type ListingLocation,
  type ListingMedia,
  type ListingModel,
  type OwnershipProofAsset,
  type OwnerType,
} from "@/lib/domain";
import { computeListingEligibility } from "@/lib/listings/eligibility";

const allowedDurations = [1, 2, 3, 6, 12] as const;

type ListingDraftInput = {
  ownerType?: unknown;
  ownerContact?: unknown;
  category?: unknown;
  title?: unknown;
  description?: unknown;
  priceRwf?: unknown;
  units?: unknown;
  requestedModel?: unknown;
  durationMonths?: unknown;
  tokenFeeEnabled?: unknown;
  location?: unknown;
  media?: unknown;
  ownershipProof?: unknown;
  features?: unknown;
};

type ValidationResult =
  | {
      ok: true;
      value: Omit<
        ListingDraftDocument,
        "_id" | "createdAt" | "updatedAt" | "ownerUserId" | "submittedAt" | "submittedListingId"
      >;
    }
  | {
      ok: false;
      errors: string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function parseOwnerType(value: unknown): OwnerType | null {
  return typeof value === "string" && ownerTypes.includes(value as OwnerType) ? (value as OwnerType) : null;
}

function parseCategory(value: unknown): ListingCategory | null {
  return typeof value === "string" && listingCategories.includes(value as ListingCategory)
    ? (value as ListingCategory)
    : null;
}

function parseRequestedModel(value: unknown): ListingModel | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return typeof value === "string" && listingModels.includes(value as ListingModel) ? (value as ListingModel) : null;
}

function parseDuration(value: unknown) {
  const parsed = parseInteger(value);
  return parsed !== null && allowedDurations.includes(parsed as (typeof allowedDurations)[number])
    ? (parsed as (typeof allowedDurations)[number])
    : null;
}

function parseOwnerContact(value: unknown): DraftOwnerContact | null {
  if (!isRecord(value)) {
    return null;
  }

  const fullName = normalizeString(value.fullName);
  const phone = normalizeString(value.phone);
  const email = normalizeString(value.email);

  if (!fullName || !phone) {
    return null;
  }

  return {
    fullName,
    phone,
    email: email || undefined,
  };
}

function parseLocation(value: unknown): ListingLocation | null {
  if (!isRecord(value)) {
    return null;
  }

  const approximateAreaLabel = normalizeString(value.approximateAreaLabel);

  if (!approximateAreaLabel) {
    return null;
  }

  return {
    approximateAreaLabel,
    district: normalizeString(value.district) || undefined,
    sector: normalizeString(value.sector) || undefined,
    cell: normalizeString(value.cell) || undefined,
    village: normalizeString(value.village) || undefined,
    upiNumber: normalizeString(value.upiNumber) || undefined,
    streetAddress: normalizeString(value.streetAddress) || undefined,
    houseNumber: normalizeString(value.houseNumber) || undefined,
    googleMapsUrl: normalizeString(value.googleMapsUrl) || undefined,
  };
}

function parseFeatures(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((feature) => normalizeString(feature))
    .filter(Boolean)
    .slice(0, 20);
}

function parseListingMedia(value: unknown): ListingMedia[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const parsedMedia = value
    .map<ListingMedia | null>((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const assetId = normalizeString(item.assetId);
      const publicId = normalizeString(item.publicId);
      const url = normalizeString(item.url);
      const originalFilename = normalizeString(item.originalFilename);
      const width = parseInteger(item.width);
      const height = parseInteger(item.height);
      const bytes = parseInteger(item.bytes);
      const format = normalizeString(item.format);
      const resourceType = normalizeString(item.resourceType);
      const alt = normalizeString(item.alt);

      if (!assetId || !publicId || !url || !originalFilename) {
        return null;
      }

      return {
        assetId,
        publicId,
        url,
        originalFilename,
        width: width && width > 0 ? width : undefined,
        height: height && height > 0 ? height : undefined,
        bytes: bytes && bytes > 0 ? bytes : undefined,
        format: format || undefined,
        resourceType: resourceType || undefined,
        alt: alt || undefined,
        isCover: Boolean(item.isCover),
      };
    })
    .filter((item): item is ListingMedia => item !== null)
    .slice(0, 10);

  if (parsedMedia.length !== value.length && value.length > 0) {
    return null;
  }

  if (parsedMedia.length > 0 && !parsedMedia.some((item) => item.isCover)) {
    parsedMedia[0] = {
      ...parsedMedia[0],
      isCover: true,
    };
  }

  return parsedMedia.map((item, index) => ({
    ...item,
    isCover: item.isCover || index === 0,
  }));
}

function parseOwnershipProof(value: unknown): OwnershipProofAsset | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return undefined;
  }

  if (!isRecord(value)) {
    return null;
  }

  const assetId = normalizeString(value.assetId);
  const publicId = normalizeString(value.publicId);
  const url = normalizeString(value.url);
  const originalFilename = normalizeString(value.originalFilename);
  const bytes = parseInteger(value.bytes);
  const format = normalizeString(value.format);
  const resourceType = normalizeString(value.resourceType);

  if (!assetId || !publicId || !url || !originalFilename) {
    return null;
  }

  return {
    assetId,
    publicId,
    url,
    originalFilename,
    bytes: bytes && bytes > 0 ? bytes : undefined,
    format: format || undefined,
    resourceType: resourceType || undefined,
    deliveryType: "authenticated",
  };
}

export function validateListingDraftInput(input: ListingDraftInput): ValidationResult {
  const errors: string[] = [];

  const ownerType = parseOwnerType(input.ownerType);
  const ownerContact = parseOwnerContact(input.ownerContact);
  const category = parseCategory(input.category);
  const title = normalizeString(input.title);
  const description = normalizeString(input.description);
  const priceRwf = parseInteger(input.priceRwf);
  const units = parseInteger(input.units);
  const requestedModel = parseRequestedModel(input.requestedModel);
  const durationMonths = parseDuration(input.durationMonths);
  const tokenFeeEnabled = Boolean(input.tokenFeeEnabled);
  const location = parseLocation(input.location);
  const media = parseListingMedia(input.media);
  const ownershipProof = parseOwnershipProof(input.ownershipProof);
  const features = parseFeatures(input.features);

  if (!ownerType) {
    errors.push("Select a valid owner type.");
  }

  if (!ownerContact) {
    errors.push("Provide owner full name and phone number.");
  }

  if (!category) {
    errors.push("Select a valid category.");
  }

  if (title.length < 10 || title.length > 80) {
    errors.push("Title must be between 10 and 80 characters.");
  }

  if (description.length < 20 || description.length > 1000) {
    errors.push("Description must be between 20 and 1000 characters.");
  }

  if (priceRwf === null || priceRwf <= 0) {
    errors.push("Enter a valid price in Rwf.");
  }

  if (units === null || units <= 0) {
    errors.push("Units must be at least 1.");
  }

  if (!durationMonths) {
    errors.push("Choose a valid duration.");
  }

  if (!location) {
    errors.push("Provide at least the approximate area label.");
  }

  if (media === null) {
    errors.push("Listing media payload is invalid.");
  }

  if (ownershipProof === null) {
    errors.push("Ownership proof payload is invalid.");
  }

  if (!category || priceRwf === null || priceRwf <= 0 || units === null || units <= 0) {
    return { ok: false, errors };
  }

  const eligibility = computeListingEligibility({
    category,
    units,
    priceRwf,
    requestedModel,
  });

  if (requestedModel === "A" && !eligibility.eligibleForModelA) {
    errors.push("Model A cannot be selected for this listing based on the current rules.");
  }

  if (errors.length > 0 || !ownerType || !ownerContact || !durationMonths || !location || media === null || ownershipProof === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      status: "draft",
      ownerType,
      ownerContact,
      category,
      title,
      description,
      priceRwf,
      units,
      requestedModel,
      durationMonths,
      tokenFeeEnabled,
      location,
      media,
      ownershipProof,
      features,
      eligibility,
    },
  };
}
