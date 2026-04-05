import { NextRequest, NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";
import {
  getRouteErrorResponse,
  readJsonObjectBody,
  RouteInputError,
} from "@/lib/http/route-input";
import { isAfripayWebhookSecretValid, resolveAfripaySignal, toAfripayFieldBag } from "@/lib/payments/afripay-signal";
import { recordPaymentGatewaySignalByReference, transitionPaymentStatusByReference } from "@/lib/payments/workflow";

function hasValidWebhookSecret(request: NextRequest) {
  const env = getServerEnv();
  const configuredSecret = env.AFRIPAY_WEBHOOK_SECRET;

  const headerValue =
    request.headers.get("x-afripay-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  return isAfripayWebhookSecretValid(configuredSecret, headerValue);
}

export async function POST(request: NextRequest) {
  try {
    if (!hasValidWebhookSecret(request)) {
      throw new RouteInputError("Invalid webhook secret.", 401);
    }

    const payload = await readJsonObjectBody(request);
    const signal = resolveAfripaySignal({
      source: "webhook",
      transport: "json",
      body: toAfripayFieldBag(payload),
    });

    if (!signal.reference) {
      throw new RouteInputError("The AfrIPay webhook is missing a valid payment reference.");
    }

    if (!signal.mappedStatus) {
      const result = await recordPaymentGatewaySignalByReference({
        reference: signal.reference,
        action: "payment_gateway_webhook_received",
        source: "afripay_webhook",
        providerReference: signal.providerReference ?? undefined,
        providerTransactionId: signal.providerTransactionId ?? undefined,
        lastProviderStatus: signal.rawStatus ?? undefined,
        failureReason: signal.failureReason ?? undefined,
        markWebhookSeen: true,
        metadata: signal.safeMetadata,
      });

      return NextResponse.json({
        status: "accepted",
        paymentStatus: result.payment.status,
        reference: result.payment.reference,
      });
    }

    const result = await transitionPaymentStatusByReference({
      reference: signal.reference,
      status: signal.mappedStatus,
      source: "afripay_webhook",
      providerReference: signal.providerReference ?? undefined,
      providerTransactionId: signal.providerTransactionId ?? undefined,
      lastProviderStatus: signal.rawStatus ?? undefined,
      failureReason: signal.failureReason ?? undefined,
      markWebhookSeen: true,
      metadata: signal.safeMetadata,
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
