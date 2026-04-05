import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";
import { buildAdminPaymentExportCsv, parseAdminPaymentExplorerFilters } from "@/lib/admin/payment-explorer";
import { getRouteErrorResponse } from "@/lib/http/route-input";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sign in before exporting payment activity.",
        },
        { status: 401 },
      );
    }

    if (!adminRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          status: "error",
          message: "This role cannot export payment activity.",
        },
        { status: 403 },
      );
    }

    const filters = parseAdminPaymentExplorerFilters({
      paymentStatus: request.nextUrl.searchParams.get("paymentStatus") ?? undefined,
      paymentPurpose: request.nextUrl.searchParams.get("paymentPurpose") ?? undefined,
      paymentQuery: request.nextUrl.searchParams.get("paymentQuery") ?? undefined,
      paymentLimit: request.nextUrl.searchParams.get("paymentLimit") ?? undefined,
    });
    const csv = await buildAdminPaymentExportCsv(filters);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payment-export-${timestamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not export payment activity.", 500);
    return NextResponse.json(
      {
        status: "error",
        message: routeError.message,
      },
      { status: routeError.statusCode },
    );
  }
}
