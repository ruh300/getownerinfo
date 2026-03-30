import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { listingEditorRoles } from "@/lib/auth/types";
import { submitDraftForReview } from "@/lib/listings/workflow";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(
  _request: NextRequest,
  context: {
    params: Promise<{ draftId: string }>;
  },
) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

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

    rateLimit = await consumeRateLimit({
      action: "listing_draft_submit",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many draft submission attempts were made. Please wait before submitting again.");
    }

    const { draftId } = await context.params;
    const result = await submitDraftForReview(session, draftId);
    const response = NextResponse.json({
      status: "ok",
      listingId: result.listingId,
      listingStatus: result.status,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const response = NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not submit the listing draft.",
      },
      { status: 400 },
    );

    return rateLimit ? applyRateLimitHeaders(response, rateLimit) : response;
  }
}
