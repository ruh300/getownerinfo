import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { unlockListingForSession } from "@/lib/listings/access";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(
  _request: NextRequest,
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
          message: "Sign in before unlocking listing contact details.",
        },
        { status: 401 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "listing_unlock_create",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many listing unlock attempts. Wait a bit before starting another checkout.");
    }

    const { listingId } = await context.params;
    const result = await unlockListingForSession(session, listingId);
    const response = NextResponse.json({
      status: "ok",
      listingId: result.listingId,
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
        message: error instanceof Error ? error.message : "Could not unlock the listing.",
      },
      { status: 400 },
    );

    return rateLimit ? applyRateLimitHeaders(response, rateLimit) : response;
  }
}
