import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getListingMessagesForSession, sendListingMessageForSession } from "@/lib/chat/workflow";

export async function GET(
  _request: NextRequest,
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
          message: "Sign in before opening listing inquiries.",
        },
        { status: 401 },
      );
    }

    const { listingId } = await context.params;
    const messages = await getListingMessagesForSession(session, listingId);

    return NextResponse.json({
      status: "ok",
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not load listing inquiries.",
      },
      { status: 400 },
    );
  }
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
          message: "Sign in before sending a listing inquiry.",
        },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as {
      body?: string;
    };
    const { listingId } = await context.params;
    const result = await sendListingMessageForSession(session, listingId, payload.body ?? "");

    return NextResponse.json({
      status: "ok",
      delivered: result.delivered,
      entry: result.message,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not send the listing inquiry.",
      },
      { status: 400 },
    );
  }
}
