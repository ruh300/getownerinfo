import { ObjectId, type Filter } from "mongodb";

import { listingCategories } from "@/lib/domain";
import { getCollection } from "@/lib/data/collections";
import type { ListingCategory, ListingDocument } from "@/lib/domain";
import { getFeeSettingsSummary, resolveListingTokenFeeRwf, type FeeSettingsSummary } from "@/lib/fee-settings/workflow";

export type PublicListingSummary = {
  id: string;
  title: string;
  category: ListingCategory;
  model: ListingDocument["model"];
  priceRwf: number;
  approximateAreaLabel: string;
  district?: string;
  coverImageUrl: string | null;
  tokenFeeEnabled: boolean;
  tokenFeeRwf?: number;
  featureCount: number;
  updatedAt: string;
};

export type PublicListingDetail = {
  id: string;
  title: string;
  category: ListingCategory;
  model: ListingDocument["model"];
  description: string;
  priceRwf: number;
  units: number;
  approximateAreaLabel: string;
  district?: string;
  streetAddress?: string;
  upiNumber?: string;
  features: string[];
  media: Array<{
    assetId: string;
    url: string;
    alt?: string;
    isCover: boolean;
  }>;
  tokenFeeEnabled: boolean;
  tokenFeeRwf?: number;
  ownerType: ListingDocument["ownerType"];
  ownerName: string;
  ownerPhone: string;
  updatedAt: string;
};

function serializeListingSummary(
  listing: ListingDocument & { _id: ObjectId },
  feeSettings: FeeSettingsSummary,
): PublicListingSummary {
  const coverImage = listing.media.find((item) => item.isCover) ?? listing.media[0];

  return {
    id: listing._id.toString(),
    title: listing.title,
    category: listing.category,
    model: listing.model,
    priceRwf: listing.priceRwf,
    approximateAreaLabel: listing.location.approximateAreaLabel,
    district: listing.location.district,
    coverImageUrl: coverImage?.url ?? null,
    tokenFeeEnabled: listing.tokenFeeEnabled,
    tokenFeeRwf: listing.tokenFeeEnabled
      ? listing.tokenFeeRwf ?? resolveListingTokenFeeRwf(feeSettings, listing.category, listing.model)
      : undefined,
    featureCount: listing.features.length,
    updatedAt: listing.updatedAt.toISOString(),
  };
}

function serializeListingDetail(
  listing: ListingDocument & { _id: ObjectId },
  feeSettings: FeeSettingsSummary,
): PublicListingDetail {
  return {
    id: listing._id.toString(),
    title: listing.title,
    category: listing.category,
    model: listing.model,
    description: listing.description,
    priceRwf: listing.priceRwf,
    units: listing.units,
    approximateAreaLabel: listing.location.approximateAreaLabel,
    district: listing.location.district,
    streetAddress: listing.location.streetAddress,
    upiNumber: listing.location.upiNumber,
    features: listing.features,
    media: listing.media.map((item) => ({
      assetId: item.assetId,
      url: item.url,
      alt: item.alt,
      isCover: item.isCover,
    })),
    tokenFeeEnabled: listing.tokenFeeEnabled,
    tokenFeeRwf: listing.tokenFeeEnabled
      ? listing.tokenFeeRwf ?? resolveListingTokenFeeRwf(feeSettings, listing.category, listing.model)
      : undefined,
    ownerType: listing.ownerType,
    ownerName: listing.ownerContact.fullName,
    ownerPhone: listing.ownerContact.phone,
    updatedAt: listing.updatedAt.toISOString(),
  };
}

export async function getPublicListings({
  query,
  category,
  limit = 24,
}: {
  query?: string;
  category?: string;
  limit?: number;
}) {
  const listings = await getCollection("listings");
  const feeSettings = await getFeeSettingsSummary();
  const normalizedQuery = query?.trim();
  const normalizedCategory = category?.trim();
  const filter: Filter<ListingDocument> = {
    status: "active",
    verificationStatus: "approved",
  };

  if (normalizedCategory && listingCategories.includes(normalizedCategory as ListingCategory)) {
    filter.category = normalizedCategory as ListingCategory;
  }

  if (normalizedQuery) {
    filter.$or = [
      { title: { $regex: normalizedQuery, $options: "i" } },
      { description: { $regex: normalizedQuery, $options: "i" } },
      { "location.approximateAreaLabel": { $regex: normalizedQuery, $options: "i" } } as Filter<ListingDocument>,
    ];
  }

  const results = await listings
    .find(filter)
    .sort({ updatedAt: -1 })
    .limit(Math.max(1, Math.min(limit, 48)))
    .toArray();

  return results.map((listing) => serializeListingSummary(listing, feeSettings));
}

export async function getPublicListingDetail(listingId: string) {
  if (!ObjectId.isValid(listingId)) {
    return null;
  }

  const listings = await getCollection("listings");
  const feeSettings = await getFeeSettingsSummary();
  const listing = await listings.findOne({
    _id: new ObjectId(listingId),
    status: "active",
    verificationStatus: "approved",
  });

  return listing ? serializeListingDetail(listing, feeSettings) : null;
}
