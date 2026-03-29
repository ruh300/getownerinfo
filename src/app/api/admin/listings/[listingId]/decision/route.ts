import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";
import { applyListingReviewDecision } from "@/lib/listings/workflow";

type DecisionBody = {
  decision?: unknown;
  reviewNote?: unknown;
};

function parseDecision(value: unknown) {
  return value === "approve" || value === "reject" ? value : null;
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ listingId: string }>;
  },
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before reviewing listings.",
        },
        { status: 401 },
      );
    }

    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This role cannot review listings.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as DecisionBody;
    const decision = parseDecision(body.decision);

    if (!decision) {
      return NextResponse.json(
        {
          status: "error",
          message: "Provide a valid review decision.",
        },
        { status: 400 },
      );
    }

    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote : undefined;
    const { listingId } = await context.params;
    const result = await applyListingReviewDecision(session, listingId, decision, reviewNote);

    return NextResponse.json({
      status: "ok",
      listingId: result.listingId,
      listingStatus: result.status,
      verificationStatus: result.verificationStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not apply the review decision.",
      },
      { status: 400 },
    );
  }
}
