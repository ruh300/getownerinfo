import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { canConfigureFees } from "@/lib/auth/types";
import { ensureUserRecord } from "@/lib/auth/user-record";
import { getCollection } from "@/lib/data/collections";
import { getFeeSettingsSummary, upsertFeeSettings, type FeeSettingsSummary } from "@/lib/fee-settings/workflow";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before reading fee settings.",
        },
        { status: 401 },
      );
    }

    const settings = await getFeeSettingsSummary();

    return NextResponse.json({
      status: "ok",
      settings,
      canEdit: canConfigureFees(session.user.role),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not load fee settings.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before updating fee settings.",
        },
        { status: 401 },
      );
    }

    if (!canConfigureFees(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Only admin accounts can update fee settings.",
        },
        { status: 403 },
      );
    }

    const actor = await ensureUserRecord(session);
    const payload = (await request.json()) as FeeSettingsSummary;
    const settings = await upsertFeeSettings(payload);
    const auditLogs = await getCollection("auditLogs");
    const now = new Date();

    await auditLogs.insertOne({
      actorUserId: actor._id,
      entityType: "platform_setting",
      entityId: "fee_settings",
      action: "fee_settings_updated",
      metadata: {
        seekerViewTokenFeeRwf: settings.seekerViewTokenFeeRwf,
        seekerPostFeeByDuration: settings.seekerPostFeeByDuration,
      },
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      status: "ok",
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Could not save fee settings.",
      },
      { status: 400 },
    );
  }
}
