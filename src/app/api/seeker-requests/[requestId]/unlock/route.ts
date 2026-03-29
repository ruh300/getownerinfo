import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { unlockSeekerRequestForSession } from "@/lib/seeker-requests/access";

export async function POST(
  _request: NextRequest,
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
          message: "Sign in before unlocking seeker contact details.",
        },
        { status: 401 },
      );
    }

    const { requestId } = await context.params;
    const result = await unlockSeekerRequestForSession(session, requestId);

    return NextResponse.json({
      status: "ok",
      seekerRequestId: result.seekerRequestId,
      unlocked: result.unlocked,
      reused: result.reused,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not unlock the seeker request.",
      },
      { status: 400 },
    );
  }
}
