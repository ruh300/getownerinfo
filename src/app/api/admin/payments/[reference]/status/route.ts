import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getOptionalTrimmedString, getRouteErrorResponse, readJsonObjectBody, RouteInputError } from "@/lib/http/route-input";
import { applyAdminManualPaymentStatus } from "@/lib/payments/workflow";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

type ManualPaymentReviewBody = {
  status?: unknown;
  reviewNote?: unknown;
};

function parseManualStatus(value: unknown) {
  return value === "paid" || value === "failed" || value === "cancelled" ? value : null;
}

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
          message: "Sign in before reviewing payments.",
        },
        { status: 401 },
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        {
          status: "error",
          message: "Only admin accounts can apply manual payment decisions.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "admin_payment_manual_status",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many manual payment decisions were made in a short period. Please wait and try again.");
    }

    const body = (await readJsonObjectBody(request)) as ManualPaymentReviewBody;
    const nextStatus = parseManualStatus(body.status);

    if (!nextStatus) {
      throw new RouteInputError("Provide a valid manual payment status.");
    }

    const reviewNote = getOptionalTrimmedString(body as Record<string, unknown>, "reviewNote");
    const { reference } = await context.params;
    const result = await applyAdminManualPaymentStatus(session, reference, nextStatus, reviewNote);

    const response = NextResponse.json({
      status: "ok",
      paymentReference: result.payment.reference,
      paymentStatus: result.payment.status,
      previousStatus: result.previousStatus,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not apply the manual payment decision.");
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
