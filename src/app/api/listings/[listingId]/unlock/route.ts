import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { unlockListingForSession } from "@/lib/listings/access";

export async function POST(
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
          message: "Sign in before unlocking listing contact details.",
        },
        { status: 401 },
      );
    }

    const { listingId } = await context.params;
    const result = await unlockListingForSession(session, listingId);

    return NextResponse.json({
      status: "ok",
      listingId: result.listingId,
      unlocked: result.unlocked,
      reused: result.reused,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not unlock the listing.",
      },
      { status: 400 },
    );
  }
}
