import { NextRequest, NextResponse } from "next/server";

import { getCollection } from "@/lib/data/collections";
import { validateListingDraftInput } from "@/lib/listings/drafts";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validation = validateListingDraftInput(body);

    if (!validation.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: "Draft validation failed.",
          errors: validation.errors,
        },
        { status: 400 },
      );
    }

    const listingDrafts = await getCollection("listingDrafts");
    const now = new Date();
    const draftDocument = {
      ...validation.value,
      createdAt: now,
      updatedAt: now,
    };

    const result = await listingDrafts.insertOne(draftDocument);

    return NextResponse.json(
      {
        status: "ok",
        draftId: result.insertedId.toString(),
        draft: draftDocument,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draft creation failed.";

    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 500 },
    );
  }
}
