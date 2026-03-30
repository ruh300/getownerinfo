import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { canCreateListings } from "@/lib/auth/types";
import { listingStatuses, type ListingStatus } from "@/lib/domain";
import {
  getOptionalTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
  RouteInputError,
} from "@/lib/http/route-input";
import { updateListingLifecycleStatus } from "@/lib/listings/workflow";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

type StatusBody = {
  status?: unknown;
  statusNote?: unknown;
};

function parseListingStatus(value: unknown): ListingStatus | null {
  return typeof value === "string" && listingStatuses.includes(value as ListingStatus)
    ? (value as ListingStatus)
    : null;
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
          message: "Sign in before updating listing lifecycle.",
        },
        { status: 401 },
      );
    }

    if (!canCreateListings(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This role cannot manage listing lifecycle states.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "listing_status_update",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 16,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many listing status changes were attempted. Please wait and try again.");
    }

    const body = (await readJsonObjectBody(request)) as StatusBody;
    const nextStatus = parseListingStatus(body.status);

    if (!nextStatus) {
      throw new RouteInputError("Provide a valid lifecycle status.");
    }

    const statusNote = getOptionalTrimmedString(body as Record<string, unknown>, "statusNote");
    const { listingId } = await context.params;
    const result = await updateListingLifecycleStatus(session, listingId, nextStatus, statusNote);

    const response = NextResponse.json({
      status: "ok",
      listingId: result.listingId,
      previousStatus: result.previousStatus,
      listingStatus: result.status,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not update the listing lifecycle.");
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
