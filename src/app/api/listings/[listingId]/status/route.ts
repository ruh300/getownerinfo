import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { canCreateListings } from "@/lib/auth/types";
import { listingStatuses, type ListingStatus } from "@/lib/domain";
import { updateListingLifecycleStatus } from "@/lib/listings/workflow";

type StatusBody = {
  status?: unknown;
  statusNote?: unknown;
};

function parseListingStatus(value: unknown): ListingStatus | null {
  return typeof value === "string" && listingStatuses.includes(value as ListingStatus)
    ? (value as ListingStatus)
    : null;
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
          message: "Sign in before updating listing lifecycle.",
        },
        { status: 401 },
      );
    }

    if (!canCreateListings(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This role cannot manage listing lifecycle states.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as StatusBody;
    const nextStatus = parseListingStatus(body.status);

    if (!nextStatus) {
      return NextResponse.json(
        {
          status: "error",
          message: "Provide a valid lifecycle status.",
        },
        { status: 400 },
      );
    }

    const statusNote = typeof body.statusNote === "string" ? body.statusNote : undefined;
    const { listingId } = await context.params;
    const result = await updateListingLifecycleStatus(session, listingId, nextStatus, statusNote);

    return NextResponse.json({
      status: "ok",
      listingId: result.listingId,
      previousStatus: result.previousStatus,
      listingStatus: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not update the listing lifecycle.",
      },
      { status: 400 },
    );
  }
}
