import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { unlockSeekerRequestForSession } from "@/lib/seeker-requests/access";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(
  _request: NextRequest,
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
          message: "Sign in before unlocking seeker contact details.",
        },
        { status: 401 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "seeker_unlock_create",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many seeker unlock attempts. Wait a bit before starting another checkout.");
    }

    const { requestId } = await context.params;
    const result = await unlockSeekerRequestForSession(session, requestId);
    const response = NextResponse.json({
      status: "ok",
      seekerRequestId: result.seekerRequestId,
      unlocked: result.unlocked,
      reused: result.reused,
      paymentReference: "paymentReference" in result ? result.paymentReference : null,
      checkoutUrl: "checkoutUrl" in result ? result.checkoutUrl : null,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const response = NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not unlock the seeker request.",
      },
      { status: 400 },
    );

    return rateLimit ? applyRateLimitHeaders(response, rateLimit) : response;
  }
}
