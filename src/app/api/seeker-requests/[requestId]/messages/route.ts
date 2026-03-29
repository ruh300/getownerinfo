import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  getSeekerMatchConversationForSession,
  sendSeekerMatchMessageForSession,
} from "@/lib/seeker-requests/messaging";

export async function GET(
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
          message: "Sign in before opening matched seeker conversations.",
        },
        { status: 401 },
      );
    }

    const { requestId } = await context.params;
    const conversation = await getSeekerMatchConversationForSession(session, requestId);

    return NextResponse.json({
      status: "ok",
      conversation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not load the matched seeker conversation.",
      },
      { status: 400 },
    );
  }
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
          message: "Sign in before sending a matched seeker message.",
        },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as {
      body?: string;
    };
    const { requestId } = await context.params;
    const result = await sendSeekerMatchMessageForSession(session, requestId, payload.body ?? "");

    return NextResponse.json({
      status: "ok",
      entry: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not send the matched seeker message.",
      },
      { status: 400 },
    );
  }
}
