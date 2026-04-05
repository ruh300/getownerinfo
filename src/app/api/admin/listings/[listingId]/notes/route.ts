import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import { getRouteErrorResponse, getRequiredTrimmedString, readJsonObjectBody, RouteInputError } from "@/lib/http/route-input";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

type ListingNoteBody = {
  note?: unknown;
};

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ listingId: string }>;
  },
) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before adding an internal note.",
        },
        { status: 401 },
      );
    }

    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Only admin or manager accounts can add internal notes.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "admin_listing_internal_note",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(
        rateLimit,
        "Too many internal notes were added in a short period. Please wait and try again.",
      );
    }

    const reviewer = await ensureUserRecord(session);
    const body = (await readJsonObjectBody(request)) as ListingNoteBody;
    const note = getRequiredTrimmedString(body as Record<string, unknown>, "note", {
      minLength: 5,
      message: "Provide an internal note with at least 5 characters.",
    });
    const { listingId } = await context.params;
    if (!ObjectId.isValid(listingId)) {
      throw new RouteInputError("The selected listing could not be found.");
    }

    const listings = await getCollection("listings");
    const auditLogs = await getCollection("auditLogs");
    const listingExists = await listings.findOne({
      _id: new ObjectId(listingId),
    });

    if (!listingExists) {
      throw new RouteInputError("The selected listing could not be found.");
    }

    const now = new Date();

    await auditLogs.insertOne({
      actorUserId: reviewer._id,
      entityType: "listing",
      entityId: listingId,
      action: "admin_internal_note_added",
      metadata: {
        note,
      },
      createdAt: now,
      updatedAt: now,
    });

    const response = NextResponse.json({
      status: "ok",
      listingId,
      note,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not save the internal note.");
    const response = NextResponse.json(
      {
        status: "error",
        message: routeError.message,
      },
      { status: routeError.statusCode },
    );

    return rateLimit ? applyRateLimitHeaders(response, rateLimit) : response;
  }
}
