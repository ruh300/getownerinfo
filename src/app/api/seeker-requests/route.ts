import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getRouteErrorResponse, readJsonObjectBody } from "@/lib/http/route-input";
import { createSeekerRequestForSession } from "@/lib/seeker-requests/workflow";
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
          message: "Sign in before posting a seeker request.",
        },
        { status: 401 },
      );
    }

    if (session.user.role !== "buyer") {
      return NextResponse.json(
        {
          status: "error",
          message: "Only buyer accounts can post seeker requests right now.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "seeker_request_create",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 4,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many seeker requests were posted from this account. Try again later.");
    }

    const body = await readJsonObjectBody(request);
    const result = await createSeekerRequestForSession(session, body);

    if (!result.ok) {
      const response = NextResponse.json(
        {
          status: "error",
          message: "Seeker request validation failed.",
          errors: result.errors,
        },
        { status: 400 },
      );

      return applyRateLimitHeaders(response, rateLimit);
    }

    const response = NextResponse.json(
      {
        status: "ok",
        requestId: result.request._id.toString(),
        request: result.request,
      },
      { status: 201 },
    );

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not create the seeker request.", 500);
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
