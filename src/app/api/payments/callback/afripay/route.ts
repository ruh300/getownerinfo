import { NextRequest, NextResponse } from "next/server";

import { getRouteErrorResponse, RouteInputError } from "@/lib/http/route-input";
import { resolveAfripaySignal } from "@/lib/payments/afripay-signal";
import {
  recordPaymentGatewaySignalByReference,
  transitionPaymentStatusByReference,
} from "@/lib/payments/workflow";

type CallbackFields = Record<string, string>;

function getQueryFields(request: NextRequest) {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

async function readCallbackFields(request: NextRequest): Promise<CallbackFields> {
  if (request.method !== "POST") {
    return {};
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return {};
  }

  const formData = await request.formData();
  const fields: CallbackFields = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      fields[key] = value;
    }
  }

  return fields;
}

async function handleCallback(request: NextRequest) {
  const query = getQueryFields(request);
  const fields = await readCallbackFields(request);
  const signal = resolveAfripaySignal({
    source: "callback",
    transport: request.method === "POST" ? "form" : "query",
    query,
    body: fields,
  });

  if (!signal.reference) {
    throw new RouteInputError("The AfrIPay callback is missing a valid payment reference.");
  }

  if (signal.mappedStatus) {
    return transitionPaymentStatusByReference({
      reference: signal.reference,
      status: signal.mappedStatus,
      source: "afripay_callback",
      providerReference: signal.providerReference ?? undefined,
      providerTransactionId: signal.providerTransactionId ?? undefined,
      lastProviderStatus: signal.rawStatus ?? undefined,
      failureReason: signal.failureReason ?? undefined,
      metadata: signal.safeMetadata,
    });
  }

  return recordPaymentGatewaySignalByReference({
    reference: signal.reference,
    action: "payment_gateway_return_received",
    source: "afripay_callback",
    providerReference: signal.providerReference ?? undefined,
    providerTransactionId: signal.providerTransactionId ?? undefined,
    lastProviderStatus: signal.rawStatus ?? undefined,
    failureReason: signal.failureReason ?? undefined,
    metadata: signal.safeMetadata,
  });
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleCallback(request);
    return NextResponse.redirect(new URL(result.redirectPath, request.url));
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not process the AfrIPay callback.");
    return NextResponse.json(
      {
        status: "error",
        message: routeError.message,
      },
      { status: routeError.statusCode },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await handleCallback(request);
    return NextResponse.redirect(new URL(result.redirectPath, request.url));
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not process the AfrIPay callback.");
    return NextResponse.json(
      {
        status: "error",
        message: routeError.message,
      },
      { status: routeError.statusCode },
    );
  }
}
