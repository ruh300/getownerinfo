import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { createSeekerResponseForSession } from "@/lib/seeker-requests/responses";

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
          message: "Sign in before responding to a seeker request.",
        },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as {
      message?: string;
    };
    const { requestId } = await context.params;
    const result = await createSeekerResponseForSession(session, requestId, payload.message ?? "");

    return NextResponse.json({
      status: "ok",
      updated: result.updated,
      response: result.response,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not send the seeker response.",
      },
      { status: 400 },
    );
  }
}
