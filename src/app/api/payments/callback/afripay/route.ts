import { NextRequest, NextResponse } from "next/server";

import { getRouteErrorResponse, RouteInputError } from "@/lib/http/route-input";
import { mapAfripayPaymentStatus } from "@/lib/payments/afripay";
import {
  recordPaymentGatewaySignalByReference,
  transitionPaymentStatusByReference,
} from "@/lib/payments/workflow";

type CallbackFields = Record<string, string>;

function getTrimmedValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getFirstValue(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = getTrimmedValue(value);

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
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

function getCallbackReference(request: NextRequest, fields: CallbackFields) {
  return getFirstValue(
    request.nextUrl.searchParams.get("reference"),
    request.nextUrl.searchParams.get("client_token"),
    fields.reference,
    fields.client_token,
  );
}

function getCallbackRawStatus(request: NextRequest, fields: CallbackFields) {
  return getFirstValue(
    request.nextUrl.searchParams.get("status"),
    request.nextUrl.searchParams.get("payment_status"),
    request.nextUrl.searchParams.get("transaction_status"),
    request.nextUrl.searchParams.get("state"),
    fields.status,
    fields.payment_status,
    fields.transaction_status,
    fields.state,
  );
}

function getProviderReference(request: NextRequest, fields: CallbackFields) {
  return getFirstValue(
    request.nextUrl.searchParams.get("providerReference"),
    request.nextUrl.searchParams.get("provider_reference"),
    request.nextUrl.searchParams.get("payment_id"),
    fields.providerReference,
    fields.provider_reference,
    fields.payment_id,
  );
}

function getProviderTransactionId(request: NextRequest, fields: CallbackFields) {
  return getFirstValue(
    request.nextUrl.searchParams.get("transactionId"),
    request.nextUrl.searchParams.get("transaction_id"),
    request.nextUrl.searchParams.get("txn_id"),
    fields.transactionId,
    fields.transaction_id,
    fields.txn_id,
  );
}

function getFailureMessage(request: NextRequest, fields: CallbackFields) {
  return getFirstValue(
    request.nextUrl.searchParams.get("message"),
    request.nextUrl.searchParams.get("error"),
    request.nextUrl.searchParams.get("comment"),
    fields.message,
    fields.error,
    fields.comment,
  );
}

function getSafeCallbackMetadata(request: NextRequest, fields: CallbackFields) {
  return {
    callbackMethod: request.method,
    returnedClientToken: getFirstValue(fields.client_token, request.nextUrl.searchParams.get("client_token")),
    returnedAmount: getFirstValue(fields.amount, request.nextUrl.searchParams.get("amount")),
    returnedCurrency: getFirstValue(fields.currency, request.nextUrl.searchParams.get("currency")),
    returnedComment: getFirstValue(fields.comment, request.nextUrl.searchParams.get("comment")),
  };
}

async function handleCallback(request: NextRequest) {
  const fields = await readCallbackFields(request);
  const reference = getCallbackReference(request, fields);

  if (!reference) {
    throw new RouteInputError("The AfrIPay callback is missing a valid payment reference.");
  }

  const rawStatus = getCallbackRawStatus(request, fields);
  const mappedStatus = mapAfripayPaymentStatus(rawStatus);
  const providerReference = getProviderReference(request, fields) ?? undefined;
  const providerTransactionId = getProviderTransactionId(request, fields) ?? undefined;
  const failureReason = getFailureMessage(request, fields) ?? undefined;

  if (mappedStatus) {
    return transitionPaymentStatusByReference({
      reference,
      status: mappedStatus,
      source: "afripay_callback",
      providerReference,
      providerTransactionId,
      lastProviderStatus: rawStatus ?? undefined,
      failureReason,
      metadata: getSafeCallbackMetadata(request, fields),
    });
  }

  return recordPaymentGatewaySignalByReference({
    reference,
    action: "payment_gateway_return_received",
    source: "afripay_callback",
    providerReference,
    providerTransactionId,
    lastProviderStatus: rawStatus ?? undefined,
    failureReason,
    metadata: getSafeCallbackMetadata(request, fields),
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
