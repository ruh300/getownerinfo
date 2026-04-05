import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  getOptionalTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
  RouteInputError,
} from "@/lib/http/route-input";
import { applyAdminPenaltyStatus } from "@/lib/penalties/workflow";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

type PenaltyDecisionBody = {
  status?: unknown;
  statusNote?: unknown;
};

function parsePenaltyStatus(value: unknown) {
  return value === "paid" || value === "waived" ? value : null;
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ penaltyId: string }>;
  },
) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before reviewing penalties.",
        },
        { status: 401 },
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        {
          status: "error",
          message: "Only admin accounts can settle or waive penalties.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "admin_penalty_status",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(
        rateLimit,
        "Too many penalty decisions were made in a short period. Please wait and try again.",
      );
    }

    const body = (await readJsonObjectBody(request)) as PenaltyDecisionBody;
    const nextStatus = parsePenaltyStatus(body.status);

    if (!nextStatus) {
      throw new RouteInputError("Provide a valid penalty status decision.");
    }

    const statusNote = getOptionalTrimmedString(body as Record<string, unknown>, "statusNote");
    const { penaltyId } = await context.params;
    const result = await applyAdminPenaltyStatus(session, penaltyId, nextStatus, statusNote);

    const response = NextResponse.json({
      status: "ok",
      penaltyId: result.penalty._id.toString(),
      penaltyStatus: result.penalty.status,
      previousStatus: result.previousStatus,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not update the penalty.");
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
