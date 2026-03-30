import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  getOptionalTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
} from "@/lib/http/route-input";
import {
  getSeekerMatchConversationForSession,
  sendSeekerMatchMessageForSession,
} from "@/lib/seeker-requests/messaging";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ requestId: string }>;
  },
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before opening matched seeker conversations.",
        },
        { status: 401 },
      );
    }

    const { requestId } = await context.params;
    const conversation = await getSeekerMatchConversationForSession(session, requestId);

    return NextResponse.json({
      status: "ok",
      conversation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not load the matched seeker conversation.",
      },
      { status: 400 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ requestId: string }>;
  },
) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before sending a matched seeker message.",
        },
        { status: 401 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "seeker_match_message_create",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 18,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "You are sending matched seeker messages too quickly. Please wait a moment and try again.");
    }

    const payload = await readJsonObjectBody(request);
    const { requestId } = await context.params;
    const result = await sendSeekerMatchMessageForSession(session, requestId, getOptionalTrimmedString(payload, "body") ?? "");

    const response = NextResponse.json({
      status: "ok",
      entry: result.message,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not send the matched seeker message.");
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
