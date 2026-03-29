import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { listingEditorRoles } from "@/lib/auth/types";
import { saveDraftForSession } from "@/lib/listings/workflow";

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

    const body = (await request.json()) as Record<string, unknown>;
    const result = await saveDraftForSession(session, body);

    if (!result.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: "Draft validation failed.",
          errors: result.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        draftId: result.draft._id.toString(),
        draft: result.draft,
        created: result.created,
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
