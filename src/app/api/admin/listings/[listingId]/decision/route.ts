import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";
import {
  getOptionalTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
  RouteInputError,
} from "@/lib/http/route-input";
import { applyListingReviewDecision } from "@/lib/listings/workflow";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

type DecisionBody = {
  decision?: unknown;
  reviewNote?: unknown;
};

function parseDecision(value: unknown) {
  return value === "approve" || value === "reject" ? value : null;
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ listingId: string }>;
  },
) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before reviewing listings.",
        },
        { status: 401 },
      );
    }

    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This role cannot review listings.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "admin_listing_review_decision",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many review decisions were made in a short period. Please wait and try again.");
    }

    const body = (await readJsonObjectBody(request)) as DecisionBody;
    const decision = parseDecision(body.decision);

    if (!decision) {
      throw new RouteInputError("Provide a valid review decision.");
    }

    const reviewNote = getOptionalTrimmedString(body as Record<string, unknown>, "reviewNote");
    const { listingId } = await context.params;
    const result = await applyListingReviewDecision(session, listingId, decision, reviewNote);

    const response = NextResponse.json({
      status: "ok",
      listingId: result.listingId,
      listingStatus: result.status,
      verificationStatus: result.verificationStatus,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not apply the review decision.");
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
