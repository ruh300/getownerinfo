import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { listingEditorRoles } from "@/lib/auth/types";
import { getCollection } from "@/lib/data/collections";
import { validateListingDraftInput } from "@/lib/listings/drafts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before saving a listing draft.",
        },
        { status: 401 },
      );
    }

    if (!listingEditorRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This role cannot create listing drafts.",
        },
        { status: 403 },
      );
    }

    const rawBody = (await request.json()) as Record<string, unknown>;
    const ownerContact = isRecord(rawBody.ownerContact) ? rawBody.ownerContact : {};
    const body: Record<string, unknown> = {
      ...rawBody,
      ownerContact: {
        ...ownerContact,
        fullName:
          typeof ownerContact.fullName === "string" && ownerContact.fullName.trim()
            ? ownerContact.fullName
            : session.user.fullName,
        phone:
          typeof ownerContact.phone === "string" && ownerContact.phone.trim()
            ? ownerContact.phone
            : session.user.phone ?? "",
        email:
          typeof ownerContact.email === "string" && ownerContact.email.trim()
            ? ownerContact.email
            : session.user.email ?? "",
      },
    };
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
