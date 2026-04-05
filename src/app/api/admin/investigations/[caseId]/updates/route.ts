import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";
import {
  getEnumValue,
  getOptionalTrimmedString,
  getRequiredTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
} from "@/lib/http/route-input";
import { recordInvestigationCaseFollowUp } from "@/lib/investigations/workflow";
import {
  investigationCaseStatuses,
  investigationUpdateChannels,
  investigationUpdateOutcomes,
  investigationUpdateTargets,
} from "@/lib/domain";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

type InvestigationUpdateBody = {
  status?: unknown;
  target?: unknown;
  channel?: unknown;
  outcome?: unknown;
  note?: unknown;
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
          message: "Sign in before logging investigation follow-up.",
        },
        { status: 401 },
      );
    }

    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Only admin or manager accounts can log investigation follow-up.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "admin_investigation_follow_up",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 40,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(
        rateLimit,
        "Too many investigation updates were logged in a short period. Please wait and try again.",
      );
    }

    const body = (await readJsonObjectBody(request)) as InvestigationUpdateBody;
    const nextStatus = getOptionalTrimmedString(body as Record<string, unknown>, "status");
    const target = getEnumValue(
      body.target,
      investigationUpdateTargets,
      "Provide a valid verification target.",
    );
    const channel = getEnumValue(
      body.channel,
      investigationUpdateChannels,
      "Provide a valid verification method.",
    );
    const outcome = getEnumValue(
      body.outcome,
      investigationUpdateOutcomes,
      "Provide a valid verification outcome.",
    );
    const note = getRequiredTrimmedString(body as Record<string, unknown>, "note", {
      minLength: 8,
      message: "Provide enough detail for the follow-up note.",
    });
    const { caseId } = await context.params;
    const result = await recordInvestigationCaseFollowUp(session, caseId, {
      target,
      channel,
      outcome,
      note,
      nextStatus: nextStatus
        ? getEnumValue(nextStatus, investigationCaseStatuses, "Provide a valid investigation status.")
        : undefined,
    });
    const response = NextResponse.json({
      status: "ok",
      investigationCaseId: result.investigationCase._id.toString(),
      investigationStatus: result.investigationCase.status,
      updateId: result.update._id.toString(),
      previousStatus: result.previousStatus,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not log the investigation follow-up.");
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
