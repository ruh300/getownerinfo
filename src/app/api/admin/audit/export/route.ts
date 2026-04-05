import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";
import { buildAdminAuditExportCsv, parseAdminAuditExplorerFilters } from "@/lib/admin/audit-explorer";
import { getRouteErrorResponse } from "@/lib/http/route-input";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before exporting audit activity.",
        },
        { status: 401 },
      );
    }

    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This role cannot export audit activity.",
        },
        { status: 403 },
      );
    }

    const filters = parseAdminAuditExplorerFilters({
      entityType: request.nextUrl.searchParams.get("entityType") ?? undefined,
      actorRole: request.nextUrl.searchParams.get("actorRole") ?? undefined,
      action: request.nextUrl.searchParams.get("action") ?? undefined,
      query: request.nextUrl.searchParams.get("query") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    const csv = await buildAdminAuditExportCsv(filters);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-export-${timestamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not export audit activity.", 500);
    return NextResponse.json(
      {
        status: "error",
        message: routeError.message,
      },
      { status: routeError.statusCode },
    );
  }
}
