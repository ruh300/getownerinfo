import { NextRequest, NextResponse } from "next/server";

import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import { applySessionCookie, clearSessionCookie, getCurrentSession } from "@/lib/auth/session";
import { getDefaultRedirectForRole, isUserRole, type AuthUser } from "@/lib/auth/types";
import { getOptionalTrimmedString, getRouteErrorResponse, readJsonObjectBody, RouteInputError } from "@/lib/http/route-input";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getClientIpAddress,
} from "@/lib/security/rate-limit";

type SessionRequestBody = {
  fullName?: unknown;
  phone?: unknown;
  email?: unknown;
  role?: unknown;
  redirectTo?: unknown;
};

function buildUserFromBody(body: SessionRequestBody): AuthUser {
  const normalizedBody = body as Record<string, unknown>;
  const fullName = getOptionalTrimmedString(normalizedBody, "fullName") ?? "";
  const phone = getOptionalTrimmedString(normalizedBody, "phone") ?? "";
  const email = getOptionalTrimmedString(normalizedBody, "email");

  if (fullName.length < 2) {
    throw new RouteInputError("Enter a full name with at least 2 characters.");
  }

  if (phone.length < 6) {
    throw new RouteInputError("Enter a phone number with at least 6 characters.");
  }

  if (!isUserRole(body.role)) {
    throw new RouteInputError("Choose a valid role.");
  }

  return {
    fullName,
    phone,
    email,
    role: body.role,
  };
}

export async function GET() {
  const session = await getCurrentSession();

  return NextResponse.json({
    status: "ok",
    session,
  });
}

export async function POST(request: NextRequest) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    rateLimit = await consumeRateLimit({
      action: "auth_session_create",
      scope: "ip",
      identifier: getClientIpAddress(request),
      max: 8,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many sign-in attempts from this network. Try again in a few minutes.");
    }

    const body = (await readJsonObjectBody(request)) as SessionRequestBody;
    const user = buildUserFromBody(body);
    const fallbackRedirect = getDefaultRedirectForRole(user.role);
    const redirectTo = sanitizeRedirectPath(body.redirectTo, fallbackRedirect);
    const response = NextResponse.json(
      {
        status: "ok",
        session: {
          user,
        },
        redirectTo,
      },
      { status: 200 },
    );

    applySessionCookie(response, user);

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not start the session.");
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

export async function DELETE() {
  const response = NextResponse.json({
    status: "ok",
  });

  clearSessionCookie(response);

  return response;
}
