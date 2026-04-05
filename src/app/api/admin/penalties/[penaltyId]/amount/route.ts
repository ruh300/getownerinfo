import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  getOptionalNumber,
  getOptionalTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
  RouteInputError,
} from "@/lib/http/route-input";
import { adjustAdminPenaltyAmount } from "@/lib/penalties/workflow";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

type PenaltyAmountBody = {
  penaltyAmountRwf?: unknown;
  statusNote?: unknown;
};

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
          message: "Sign in before adjusting penalties.",
        },
        { status: 401 },
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        {
          status: "error",
          message: "Only admin accounts can adjust penalties.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "admin_penalty_adjustment",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(
        rateLimit,
        "Too many penalty adjustments were attempted in a short period. Please wait and try again.",
      );
    }

    const body = (await readJsonObjectBody(request)) as PenaltyAmountBody;
    const penaltyAmountRwf = getOptionalNumber(body as Record<string, unknown>, "penaltyAmountRwf");

    if (typeof penaltyAmountRwf !== "number" || !Number.isInteger(penaltyAmountRwf) || penaltyAmountRwf <= 0) {
      throw new RouteInputError("Provide a valid adjusted penalty amount.");
    }

    const statusNote = getOptionalTrimmedString(body as Record<string, unknown>, "statusNote");
    const { penaltyId } = await context.params;
    const result = await adjustAdminPenaltyAmount(session, penaltyId, penaltyAmountRwf, statusNote);
    const response = NextResponse.json({
      status: "ok",
      penaltyId: result.penalty._id.toString(),
      previousAmountRwf: result.previousAmountRwf,
      penaltyAmountRwf: result.penalty.penaltyAmountRwf,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not adjust the penalty.");
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
