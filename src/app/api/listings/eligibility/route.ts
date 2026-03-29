import { NextRequest, NextResponse } from "next/server";

import { listingCategories, listingModels, type ListingCategory, type ListingModel } from "@/lib/domain";
import { computeListingEligibility } from "@/lib/listings/eligibility";

function parseCategory(value: string | null): ListingCategory | null {
  if (!value) {
    return null;
  }

  return listingCategories.includes(value as ListingCategory) ? (value as ListingCategory) : null;
}

function parseRequestedModel(value: string | null): ListingModel | null {
  if (!value) {
    return null;
  }

  return listingModels.includes(value as ListingModel) ? (value as ListingModel) : null;
}

function parsePositiveWholeNumber(value: string | null, fallback: number | null = null) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = parseCategory(searchParams.get("category"));
  const units = parsePositiveWholeNumber(searchParams.get("units"), 1);
  const priceRwf = parsePositiveWholeNumber(searchParams.get("priceRwf"));
  const requestedModel = parseRequestedModel(searchParams.get("requestedModel"));

  if (!category || units === null || priceRwf === null) {
    return NextResponse.json(
      {
        status: "error",
        message:
          "Provide category, units, and priceRwf. Example: /api/listings/eligibility?category=real_estate_rent&units=1&priceRwf=1500000",
      },
      { status: 400 },
    );
  }

  const result = computeListingEligibility({
    category,
    units,
    priceRwf,
    requestedModel,
  });

  return NextResponse.json({
    status: "ok",
    input: {
      category,
      units,
      priceRwf,
      requestedModel,
    },
    result,
  });
}
