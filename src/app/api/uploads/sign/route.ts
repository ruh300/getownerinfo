import { NextRequest, NextResponse } from "next/server";

import { createSignedUploadParams, getCloudinaryUploadConfig, type UploadAssetKind } from "@/lib/cloudinary";

type RequestPayload = {
  assetKind?: unknown;
  filename?: unknown;
  contentType?: unknown;
  size?: unknown;
};

function isUploadAssetKind(value: unknown): value is UploadAssetKind {
  return value === "listing-image" || value === "ownership-proof";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestPayload;
    const assetKind = body.assetKind;
    const filename = typeof body.filename === "string" ? body.filename.trim() : "";
    const contentType = typeof body.contentType === "string" ? body.contentType.trim() : "";
    const size = typeof body.size === "number" ? body.size : Number.NaN;

    if (!isUploadAssetKind(assetKind) || !filename || !contentType || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Provide assetKind, filename, contentType, and size.",
        },
        { status: 400 },
      );
    }

    const config = getCloudinaryUploadConfig(assetKind);

    if (!config.allowedMimeTypes.some((mimeType) => mimeType === contentType)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This file type is not allowed for the selected upload.",
        },
        { status: 400 },
      );
    }

    if (size > config.maxFileSizeBytes) {
      return NextResponse.json(
        {
          status: "error",
          message: `File exceeds the ${Math.round(config.maxFileSizeBytes / (1024 * 1024))}MB limit.`,
        },
        { status: 400 },
      );
    }

    const upload = createSignedUploadParams(assetKind, filename);

    return NextResponse.json({
      status: "ok",
      assetKind,
      upload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Upload signing failed.",
      },
      { status: 500 },
    );
  }
}
