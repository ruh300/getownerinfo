import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import type { AuthSession } from "@/lib/auth/types";
import type { RateLimitScope } from "@/lib/domain";
import { getCollection } from "@/lib/data/collections";

type RateLimitInput = {
  action: string;
  scope: RateLimitScope;
  identifier: string;
  max: number;
  windowMs: number;
};

export type RateLimitResult = {
  action: string;
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: string;
};

function hashIdentifier(identifier: string) {
  return createHash("sha256").update(identifier).digest("hex");
}

function resolveBucketStartedAt(now: Date, windowMs: number) {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

function buildBucketKey(action: string, scope: RateLimitScope, identifierHash: string, bucketStartedAt: Date) {
  return `${action}:${scope}:${identifierHash}:${bucketStartedAt.getTime()}`;
}

export function getClientIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstForwardedIp = forwardedFor.split(",")[0]?.trim();

    if (firstForwardedIp) {
      return firstForwardedIp;
    }
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "unknown";
}

export function getSessionRateLimitIdentifier(session: AuthSession) {
  const phone = session.user.phone?.trim().toLowerCase();
  const email = session.user.email?.trim().toLowerCase();
  const fallbackName = session.user.fullName.trim().toLowerCase();

  return `${session.user.role}:${phone ?? email ?? fallbackName}`;
}

export async function consumeRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = new Date();
  const bucketStartedAt = resolveBucketStartedAt(now, input.windowMs);
  const expiresAt = new Date(bucketStartedAt.getTime() + input.windowMs);
  const identifierHash = hashIdentifier(input.identifier);
  const key = buildBucketKey(input.action, input.scope, identifierHash, bucketStartedAt);
  const rateLimitBuckets = await getCollection("rateLimitBuckets");
  const bucket = await rateLimitBuckets.findOneAndUpdate(
    {
      key,
    },
    {
      $inc: {
        count: 1,
      },
      $set: {
        action: input.action,
        scope: input.scope,
        identifierHash,
        windowMs: input.windowMs,
        bucketStartedAt,
        expiresAt,
        lastSeenAt: now,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    },
  );
  const count = bucket?.count ?? 1;
  const remaining = Math.max(input.max - count, 0);

  return {
    action: input.action,
    allowed: count <= input.max,
    count,
    limit: input.max,
    remaining,
    retryAfterSeconds: Math.max(Math.ceil((expiresAt.getTime() - now.getTime()) / 1000), 1),
    resetAt: expiresAt.toISOString(),
  };
}

export function applyRateLimitHeaders(response: NextResponse, result: RateLimitResult) {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", result.resetAt);

  if (!result.allowed) {
    response.headers.set("Retry-After", String(result.retryAfterSeconds));
  }

  return response;
}

export function createRateLimitErrorResponse(result: RateLimitResult, message: string) {
  const response = NextResponse.json(
    {
      status: "error",
      message,
      retryAfterSeconds: result.retryAfterSeconds,
      rateLimit: {
        action: result.action,
        limit: result.limit,
        remaining: result.remaining,
        resetAt: result.resetAt,
      },
    },
    { status: 429 },
  );

  return applyRateLimitHeaders(response, result);
}
