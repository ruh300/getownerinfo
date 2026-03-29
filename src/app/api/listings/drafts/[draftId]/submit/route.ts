import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { listingEditorRoles } from "@/lib/auth/types";
import { submitDraftForReview } from "@/lib/listings/workflow";

export async function POST(
  _request: NextRequest,
  context: {
    params: Promise<{ draftId: string }>;
  },
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before submitting a listing draft.",
        },
        { status: 401 },
      );
    }

    if (!listingEditorRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This role cannot submit listing drafts.",
        },
        { status: 403 },
      );
    }

    const { draftId } = await context.params;
    const result = await submitDraftForReview(session, draftId);

    return NextResponse.json({
      status: "ok",
      listingId: result.listingId,
      listingStatus: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not submit the listing draft.",
      },
      { status: 400 },
    );
  }
}
