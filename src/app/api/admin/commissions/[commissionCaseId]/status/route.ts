import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  getOptionalTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
  RouteInputError,
} from "@/lib/http/route-input";
import { applyAdminCommissionCaseStatus } from "@/lib/commissions/workflow";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

type CommissionDecisionBody = {
  status?: unknown;
  statusNote?: unknown;
};

function parseCommissionStatus(value: unknown) {
  return value === "paid" || value === "waived" ? value : null;
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ commissionCaseId: string }>;
  },
) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before reviewing commission cases.",
        },
        { status: 401 },
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        {
          status: "error",
          message: "Only admin accounts can settle or waive commission cases.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "admin_commission_case_status",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(
        rateLimit,
        "Too many commission decisions were made in a short period. Please wait and try again.",
      );
    }

    const body = (await readJsonObjectBody(request)) as CommissionDecisionBody;
    const nextStatus = parseCommissionStatus(body.status);

    if (!nextStatus) {
      throw new RouteInputError("Provide a valid commission status decision.");
    }

    const statusNote = getOptionalTrimmedString(body as Record<string, unknown>, "statusNote");
    const { commissionCaseId } = await context.params;
    const result = await applyAdminCommissionCaseStatus(session, commissionCaseId, nextStatus, statusNote);

    const response = NextResponse.json({
      status: "ok",
      commissionCaseId: result.commissionCase._id.toString(),
      commissionStatus: result.commissionCase.status,
      previousStatus: result.previousStatus,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not update the commission case.");
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
