import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { listingEditorRoles } from "@/lib/auth/types";
import { getRouteErrorResponse, readJsonObjectBody } from "@/lib/http/route-input";
import { saveDraftForSession } from "@/lib/listings/workflow";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

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

    rateLimit = await consumeRateLimit({
      action: "listing_draft_save",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 40,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many draft saves were attempted. Please pause for a moment before saving again.");
    }

    const body = await readJsonObjectBody(request);
    const result = await saveDraftForSession(session, body);

    if (!result.ok) {
      const response = NextResponse.json(
        {
          status: "error",
          message: "Draft validation failed.",
          errors: result.errors,
        },
        { status: 400 },
      );

      return applyRateLimitHeaders(response, rateLimit);
    }

    const response = NextResponse.json(
      {
        status: "ok",
        draftId: result.draft._id.toString(),
        draft: result.draft,
        created: result.created,
      },
      { status: 201 },
    );

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Draft creation failed.", 500);
    const response = NextResponse.json(
      {
        status: "error",
        message: routeError.message,
      },
      { status: routeError.statusCode },
    );

    return rateLimit ? applyRateLimitHeaders(response, rateLimit) : response;
  }
}
