import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";

import { type UserRole } from "@/lib/domain";

import { authCookieName } from "./constants";
import { getDefaultRedirectForRole, isUserRole, type AuthSession, type AuthUser } from "./types";

const sessionDurationSeconds = 60 * 60 * 24 * 7;
const developmentSessionSecret = "getownerinfo-dev-session-secret-change-this";

function getSessionSecret() {
  const value = process.env.AUTH_SESSION_SECRET;

  if (value && value.length >= 32) {
    return value;
  }

  if (process.env.NODE_ENV !== "production") {
    return developmentSessionSecret;
  }

  throw new Error("Missing required environment variable: AUTH_SESSION_SECRET");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

function normalizeOptionalField(value: string | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

function normalizeUser(user: AuthUser): AuthUser {
  return {
    fullName: user.fullName.trim(),
    role: user.role,
    email: normalizeOptionalField(user.email),
    phone: normalizeOptionalField(user.phone),
  };
}

function isValidUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AuthUser>;

  return (
    typeof candidate.fullName === "string" &&
    candidate.fullName.trim().length >= 2 &&
    isUserRole(candidate.role) &&
    (candidate.email === undefined || typeof candidate.email === "string") &&
    (candidate.phone === undefined || typeof candidate.phone === "string")
  );
}

function isValidSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AuthSession>;

  return (
    isValidUser(candidate.user) &&
    typeof candidate.issuedAt === "string" &&
    typeof candidate.expiresAt === "string" &&
    Number.isFinite(new Date(candidate.issuedAt).getTime()) &&
    Number.isFinite(new Date(candidate.expiresAt).getTime())
  );
}

export function createSessionToken(user: AuthUser) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + sessionDurationSeconds * 1000);
  const session: AuthSession = {
    user: normalizeUser(user),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function readSessionToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as unknown;

    if (!isValidSession(session)) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;

  return readSessionToken(token);
}

export async function requireSession(options?: { roles?: UserRole[]; redirectTo?: string }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect(options?.redirectTo ?? "/sign-in");
  }

  if (options?.roles && !options.roles.includes(session.user.role)) {
    redirect(getDefaultRedirectForRole(session.user.role));
  }

  return session;
}

export function applySessionCookie(response: NextResponse, user: AuthUser) {
  response.cookies.set({
    name: authCookieName,
    value: createSessionToken(user),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: authCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
