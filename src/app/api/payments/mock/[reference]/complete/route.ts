import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getEnumValue, getRouteErrorResponse, readJsonObjectBody } from "@/lib/http/route-input";
import { completeMockPaymentForSession } from "@/lib/payments/workflow";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ reference: string }>;
  },
) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before completing the mock checkout.",
        },
        { status: 401 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "mock_payment_complete",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many payment completion attempts were made. Please wait before trying again.");
    }

    const payload = await readJsonObjectBody(request);
    const outcome = getEnumValue(
      payload.outcome,
      ["paid", "failed", "cancelled"] as const,
      "Choose a valid mock payment outcome.",
    );

    const { reference } = await context.params;
    const result = await completeMockPaymentForSession(session, reference, outcome);
    const response = NextResponse.json({
      status: "ok",
      paymentStatus: result.payment.status,
      redirectPath: result.redirectPath,
      reference: result.payment.reference,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not complete the mock checkout.");
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
