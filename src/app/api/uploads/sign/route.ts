import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { listingEditorRoles } from "@/lib/auth/types";
import { createSignedUploadParams, getCloudinaryUploadConfig } from "@/lib/cloudinary";
import {
  getEnumValue,
  getOptionalNumber,
  getRequiredTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
  RouteInputError,
} from "@/lib/http/route-input";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
  createRateLimitErrorResponse,
  getSessionRateLimitIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>> | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before requesting upload credentials.",
        },
        { status: 401 },
      );
    }

    if (!listingEditorRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This role cannot request listing upload credentials.",
        },
        { status: 403 },
      );
    }

    rateLimit = await consumeRateLimit({
      action: "upload_signature_create",
      scope: "session",
      identifier: getSessionRateLimitIdentifier(session),
      max: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return createRateLimitErrorResponse(rateLimit, "Too many upload-sign requests were made from this account. Please wait a moment.");
    }

    const body = await readJsonObjectBody(request);
    const assetKind = getEnumValue(body.assetKind, ["listing-image", "ownership-proof"] as const, "Provide a valid assetKind.");
    const filename = getRequiredTrimmedString(body, "filename", { message: "Provide a filename." });
    const contentType = getRequiredTrimmedString(body, "contentType", { message: "Provide a contentType." });
    const size = getOptionalNumber(body, "size");

    if (!size || size <= 0) {
      throw new RouteInputError("Provide a valid size.");
    }

    const config = getCloudinaryUploadConfig(assetKind);

    if (!config.allowedMimeTypes.some((mimeType) => mimeType === contentType)) {
      const response = NextResponse.json(
        {
          status: "error",
          message: "This file type is not allowed for the selected upload.",
        },
        { status: 400 },
      );

      return applyRateLimitHeaders(response, rateLimit);
    }

    if (size > config.maxFileSizeBytes) {
      const response = NextResponse.json(
        {
          status: "error",
          message: `File exceeds the ${Math.round(config.maxFileSizeBytes / (1024 * 1024))}MB limit.`,
        },
        { status: 400 },
      );

      return applyRateLimitHeaders(response, rateLimit);
    }

    const upload = createSignedUploadParams(assetKind, filename);
    const response = NextResponse.json({
      status: "ok",
      assetKind,
      upload,
    });

    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Upload signing failed.", 500);
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
