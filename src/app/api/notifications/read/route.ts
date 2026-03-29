import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { markAllNotificationsReadForSession } from "@/lib/notifications/workflow";

export async function POST() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "You must be signed in to manage notifications.",
        },
        { status: 401 },
      );
    }

    const modifiedCount = await markAllNotificationsReadForSession(session);

    return NextResponse.json({
      status: "ok",
      modifiedCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not mark notifications as read.",
      },
      { status: 400 },
    );
  }
}
