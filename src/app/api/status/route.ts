import { NextResponse } from "next/server";

import { getCloudinary } from "@/lib/cloudinary";
import { getServerEnv, maskSecret } from "@/lib/env";
import { getDatabase } from "@/lib/mongodb";
import { getAfripayConfigStatus, probeAfripayGateway } from "@/lib/payments/afripay";

export async function GET() {
  const env = getServerEnv();
  const afripay = getAfripayConfigStatus();
  const afripayGateway = await probeAfripayGateway();
  const mongodb = {
    connected: false,
    database: env.MONGODB_DB,
    error: null as string | null,
  };

  const cloudinaryService = {
    connected: false,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: maskSecret(env.CLOUDINARY_API_KEY),
    error: null as string | null,
  };

  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    mongodb.connected = true;
  } catch (error) {
    mongodb.error = error instanceof Error ? error.message : "Unknown MongoDB setup error";
  }

  try {
    const cloudinaryStatus = await getCloudinary().api.ping();
    cloudinaryService.connected = cloudinaryStatus.status === "ok";
  } catch (error) {
    cloudinaryService.error = error instanceof Error ? error.message : "Unknown Cloudinary setup error";
  }

  const allHealthy = mongodb.connected && cloudinaryService.connected;
  const partiallyHealthy = mongodb.connected || cloudinaryService.connected;

  return NextResponse.json(
    {
      status: allHealthy ? "ok" : partiallyHealthy ? "degraded" : "error",
      checkedAt: new Date().toISOString(),
      services: {
        mongodb,
        cloudinary: cloudinaryService,
        afripay: {
          ...afripay,
          gateway: afripayGateway,
        },
      },
    },
    {
      status: allHealthy ? 200 : partiallyHealthy ? 207 : 500,
    },
  );
}
