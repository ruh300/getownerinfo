import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import type { SeekerRequestStatus } from "@/lib/domain";
import {
  getOptionalTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
  RouteInputError,
} from "@/lib/http/route-input";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";
import { updateSeekerRequestLifecycleForSession } from "@/lib/seeker-requests/lifecycle";

type StatusBody = {
  status?: unknown;
  responseId?: unknown;
  closureNote?: unknown;
};

function parseLifecycleStatus(value: unknown): Extract<SeekerRequestStatus, "fulfilled" | "closed"> | null {
  return value === "fulfilled" || value === "closed" ? value : null;
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
          message: "Sign in before updating seeker request status.",
        },
        { status: 401 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "seeker_request_status_update",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 12,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many seeker request status changes were attempted. Please wait and try again.");
    }

    const body = (await readJsonObjectBody(request)) as StatusBody;
    const nextStatus = parseLifecycleStatus(body.status);

    if (!nextStatus) {
      throw new RouteInputError("Provide a valid seeker request lifecycle status.");
    }

    const { requestId } = await context.params;
    const result = await updateSeekerRequestLifecycleForSession(session, requestId, {
      status: nextStatus,
      responseId: getOptionalTrimmedString(body as Record<string, unknown>, "responseId"),
      closureNote: getOptionalTrimmedString(body as Record<string, unknown>, "closureNote"),
    });

    const response = NextResponse.json({
      status: "ok",
      seekerRequestId: result.seekerRequestId,
      previousStatus: result.previousStatus,
      seekerRequestStatus: result.status,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not update the seeker request status.");
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
