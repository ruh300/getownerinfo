import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";
import {
  getOptionalTrimmedString,
  getRouteErrorResponse,
  readJsonObjectBody,
  RouteInputError,
} from "@/lib/http/route-input";
import { mapAfripayPaymentStatus } from "@/lib/payments/afripay";
import { transitionPaymentStatusByReference } from "@/lib/payments/workflow";

function hasValidWebhookSecret(request: NextRequest) {
  const env = getServerEnv();
  const configuredSecret = env.AFRIPAY_WEBHOOK_SECRET;

  if (!configuredSecret) {
    return true;
  }

  const headerValue =
    request.headers.get("x-afripay-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const providedBuffer = Buffer.from(headerValue);
  const expectedBuffer = Buffer.from(configuredSecret);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!hasValidWebhookSecret(request)) {
      throw new RouteInputError("Invalid webhook secret.", 401);
    }

    const payload = await readJsonObjectBody(request);
    const reference = getOptionalTrimmedString(payload, "reference") ?? getOptionalTrimmedString(payload, "client_token");
    const rawStatus =
      getOptionalTrimmedString(payload, "status") ??
      getOptionalTrimmedString(payload, "payment_status") ??
      getOptionalTrimmedString(payload, "transaction_status") ??
      getOptionalTrimmedString(payload, "state");
    const mappedStatus = mapAfripayPaymentStatus(rawStatus);

    if (!reference || !mappedStatus) {
      throw new RouteInputError("The AfrIPay webhook is missing a valid reference or status.");
    }

    const result = await transitionPaymentStatusByReference({
      reference,
      status: mappedStatus,
      source: "afripay_webhook",
      providerReference:
        getOptionalTrimmedString(payload, "providerReference") ??
        getOptionalTrimmedString(payload, "provider_reference") ??
        getOptionalTrimmedString(payload, "payment_id"),
      providerTransactionId:
        getOptionalTrimmedString(payload, "transactionId") ??
        getOptionalTrimmedString(payload, "transaction_id") ??
        getOptionalTrimmedString(payload, "txn_id"),
      lastProviderStatus: rawStatus ?? undefined,
      failureReason:
        getOptionalTrimmedString(payload, "message") ??
        getOptionalTrimmedString(payload, "error") ??
        getOptionalTrimmedString(payload, "comment"),
      markWebhookSeen: true,
      metadata: {
        webhookStatus: rawStatus,
      },
    });

    return NextResponse.json({
      status: "ok",
      paymentStatus: result.payment.status,
      reference: result.payment.reference,
    });
  } catch (error) {
    const routeError = getRouteErrorResponse(error, "Could not process the AfrIPay webhook.");
    return NextResponse.json(
      {
        status: "error",
        message: routeError.message,
      },
      { status: routeError.statusCode },
    );
  }
}
