import { NextRequest, NextResponse } from "next/server";

import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import { applySessionCookie, clearSessionCookie, getCurrentSession } from "@/lib/auth/session";
import { getDefaultRedirectForRole, isUserRole, type AuthUser } from "@/lib/auth/types";

type SessionRequestBody = {
  fullName?: unknown;
  phone?: unknown;
  email?: unknown;
  role?: unknown;
  redirectTo?: unknown;
};

function normalizeInput(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildUserFromBody(body: SessionRequestBody): AuthUser {
  const fullName = normalizeInput(body.fullName);
  const phone = normalizeInput(body.phone);
  const email = normalizeInput(body.email);

  if (fullName.length < 2) {
    throw new Error("Enter a full name with at least 2 characters.");
  }

  if (phone.length < 6) {
    throw new Error("Enter a phone number with at least 6 characters.");
  }

  if (!isUserRole(body.role)) {
    throw new Error("Choose a valid role.");
  }

  return {
    fullName,
    phone,
    email: email || undefined,
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
  try {
    const body = (await request.json()) as SessionRequestBody;
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

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not start the session.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    status: "ok",
  });

  clearSessionCookie(response);

  return response;
}
