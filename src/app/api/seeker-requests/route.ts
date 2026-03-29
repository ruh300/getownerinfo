import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { createSeekerRequestForSession } from "@/lib/seeker-requests/workflow";

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before posting a seeker request.",
        },
        { status: 401 },
      );
    }

    if (session.user.role !== "buyer") {
      return NextResponse.json(
        {
          status: "error",
          message: "Only buyer accounts can post seeker requests right now.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const result = await createSeekerRequestForSession(session, body);

    if (!result.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: "Seeker request validation failed.",
          errors: result.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        requestId: result.request._id.toString(),
        request: result.request,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not create the seeker request.",
      },
      { status: 500 },
    );
  }
}
