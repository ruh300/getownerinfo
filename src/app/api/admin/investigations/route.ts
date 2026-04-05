import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";
import { getEnumValue, getRequiredTrimmedString, getRouteErrorResponse, readJsonObjectBody } from "@/lib/http/route-input";
import { createInvestigationCase } from "@/lib/investigations/workflow";
import { investigationCasePriorities, investigationCaseTypes } from "@/lib/domain";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

type CreateInvestigationBody = {
  entityType?: unknown;
  entityId?: unknown;
  caseType?: unknown;
  priority?: unknown;
  summary?: unknown;
};

const supportedEntityTypes = ["listing", "commission_case", "penalty", "payment", "user"] as const;

export async function POST(request: NextRequest) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before opening an investigation case.",
        },
        { status: 401 },
      );
    }

    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Only admin or manager accounts can open investigation cases.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "admin_investigation_create",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(
        rateLimit,
        "Too many investigation cases were opened in a short period. Please wait and try again.",
      );
    }

    const body = (await readJsonObjectBody(request)) as CreateInvestigationBody;
    const entityType = getEnumValue(body.entityType, supportedEntityTypes, "Provide a valid investigation target.");
    const entityId = getRequiredTrimmedString(body as Record<string, unknown>, "entityId", {
      message: "Provide a valid target identifier.",
    });
    const caseType = getEnumValue(body.caseType, investigationCaseTypes, "Provide a valid investigation type.");
    const priority = getEnumValue(body.priority, investigationCasePriorities, "Provide a valid investigation priority.");
    const summary = getRequiredTrimmedString(body as Record<string, unknown>, "summary", {
      minLength: 8,
      message: "Provide enough detail for the investigation summary.",
    });
    const result = await createInvestigationCase(session, {
      entityType,
      entityId,
      caseType,
      priority,
      summary,
    });
    const response = NextResponse.json({
      status: "ok",
      investigationCaseId: result.investigationCase._id.toString(),
      created: result.created,
      investigationStatus: result.investigationCase.status,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not open the investigation case.");
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
