import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getListingMessagesForSession, sendListingMessageForSession } from "@/lib/chat/workflow";
import {
  getOptionalTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
} from "@/lib/http/route-input";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ listingId: string }>;
  },
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before opening listing inquiries.",
        },
        { status: 401 },
      );
    }

    const { listingId } = await context.params;
    const messages = await getListingMessagesForSession(session, listingId);

    return NextResponse.json({
      status: "ok",
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not load listing inquiries.",
      },
      { status: 400 },
    );
  }
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
          message: "Sign in before sending a listing inquiry.",
        },
        { status: 401 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "listing_message_create",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 18,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "You are sending listing messages too quickly. Please wait a moment and try again.");
    }

    const payload = await readJsonObjectBody(request);
    const { listingId } = await context.params;
    const result = await sendListingMessageForSession(session, listingId, getOptionalTrimmedString(payload, "body") ?? "", {
      buyerUserId: getOptionalTrimmedString(payload, "buyerUserId"),
    });

    const response = NextResponse.json({
      status: "ok",
      delivered: result.delivered,
      entry: result.message,
      error: result.error,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not send the listing inquiry.");
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
