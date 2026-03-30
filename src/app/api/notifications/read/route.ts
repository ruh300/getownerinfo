import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { markAllNotificationsReadForSession } from "@/lib/notifications/workflow";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

export async function POST() {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "You must be signed in to manage notifications.",
        },
        { status: 401 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "notification_mark_read",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Notification updates are happening too quickly. Please wait a moment and try again.");
    }

    const modifiedCount = await markAllNotificationsReadForSession(session);
    const response = NextResponse.json({
      status: "ok",
      modifiedCount,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const response = NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not mark notifications as read.",
      },
      { status: 400 },
    );

    return rateLimit ? applyRateLimitHeaders(response, rateLimit) : response;
  }
}
