import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";
import {
  getEnumValue,
  getOptionalTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
} from "@/lib/http/route-input";
import { updateInvestigationCaseStatus } from "@/lib/investigations/workflow";
import { investigationCaseStatuses } from "@/lib/domain";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

type InvestigationStatusBody = {
  status?: unknown;
  resolutionNote?: unknown;
};

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ caseId: string }>;
  },
) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before updating investigation cases.",
        },
        { status: 401 },
      );
    }

    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Only admin or manager accounts can update investigation cases.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "admin_investigation_status",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(
        rateLimit,
        "Too many investigation updates were made in a short period. Please wait and try again.",
      );
    }

    const body = (await readJsonObjectBody(request)) as InvestigationStatusBody;
    const nextStatus = getEnumValue(body.status, investigationCaseStatuses, "Provide a valid investigation status.");
    const resolutionNote = getOptionalTrimmedString(body as Record<string, unknown>, "resolutionNote");
    const { caseId } = await context.params;
    const result = await updateInvestigationCaseStatus(session, caseId, nextStatus, resolutionNote);
    const response = NextResponse.json({
      status: "ok",
      investigationCaseId: result.investigationCase._id.toString(),
      previousStatus: result.previousStatus,
      investigationStatus: result.investigationCase.status,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not update the investigation case.");
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
