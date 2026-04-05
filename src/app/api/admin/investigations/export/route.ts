import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";
import {
  buildAdminInvestigationExportCsv,
  parseAdminInvestigationExplorerFilters,
} from "@/lib/investigations/workflow";
import { getRouteErrorResponse } from "@/lib/http/route-input";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before exporting investigation activity.",
        },
        { status: 401 },
      );
    }

    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This role cannot export investigation activity.",
        },
        { status: 403 },
      );
    }

    const filters = parseAdminInvestigationExplorerFilters({
      investigationStatus: request.nextUrl.searchParams.get("investigationStatus") ?? undefined,
      investigationType: request.nextUrl.searchParams.get("investigationType") ?? undefined,
      investigationPriority: request.nextUrl.searchParams.get("investigationPriority") ?? undefined,
      investigationQuery: request.nextUrl.searchParams.get("investigationQuery") ?? undefined,
      investigationLimit: request.nextUrl.searchParams.get("investigationLimit") ?? undefined,
    });
    const csv = await buildAdminInvestigationExportCsv(filters);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="investigation-export-${timestamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not export investigation activity.", 500);
    return NextResponse.json(
      {
        status: "error",
        message: routeError.message,
      },
      { status: routeError.statusCode },
    );
  }
}
