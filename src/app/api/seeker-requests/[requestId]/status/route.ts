import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import type { SeekerRequestStatus } from "@/lib/domain";
import { updateSeekerRequestLifecycleForSession } from "@/lib/seeker-requests/lifecycle";

type StatusBody = {
  status?: unknown;
  responseId?: unknown;
  closureNote?: unknown;
};

function parseLifecycleStatus(value: unknown): Extract<SeekerRequestStatus, "fulfilled" | "closed"> | null {
  return value === "fulfilled" || value === "closed" ? value : null;
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ requestId: string }>;
  },
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before updating seeker request status.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as StatusBody;
    const nextStatus = parseLifecycleStatus(body.status);

    if (!nextStatus) {
      return NextResponse.json(
        {
          status: "error",
          message: "Provide a valid seeker request lifecycle status.",
        },
        { status: 400 },
      );
    }

    const { requestId } = await context.params;
    const result = await updateSeekerRequestLifecycleForSession(session, requestId, {
      status: nextStatus,
      responseId: typeof body.responseId === "string" ? body.responseId : undefined,
      closureNote: typeof body.closureNote === "string" ? body.closureNote : undefined,
    });

    return NextResponse.json({
      status: "ok",
      seekerRequestId: result.seekerRequestId,
      previousStatus: result.previousStatus,
      seekerRequestStatus: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not update the seeker request status.",
      },
      { status: 400 },
    );
  }
}
