import { timingSafeEqual } from "node:crypto";

import type { PaymentStatus } from "@/lib/domain";

export type AfripayFieldBag = Record<string, string | null | undefined>;

export type AfripaySignalInput = {
  source: "callback" | "webhook";
  transport: "query" | "form" | "json";
  query?: AfripayFieldBag;
  body?: AfripayFieldBag;
};

export type AfripaySignal = {
  reference: string | null;
  rawStatus: string | null;
  mappedStatus: Extract<PaymentStatus, "paid" | "failed" | "cancelled"> | null;
  providerReference: string | null;
  providerTransactionId: string | null;
  failureReason: string | null;
  safeMetadata: Record<string, unknown>;
};

const previewKeys = [
  "reference",
  "client_token",
  "status",
  "payment_status",
  "transaction_status",
  "state",
  "providerReference",
  "provider_reference",
  "payment_id",
  "transactionId",
  "transaction_id",
  "txn_id",
  "amount",
  "currency",
  "comment",
  "message",
  "error",
  "app_id",
  "app_secret",
  "public_key",
  "secret_key",
  "signature",
  "authorization",
  "token",
];

export function toAfripayFieldBag(values: Record<string, unknown>): AfripayFieldBag {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? value : undefined]),
  );
}

function getTrimmedValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeAfripayStatus(rawStatus: string | null | undefined) {
  const trimmed = getTrimmedValue(rawStatus);

  if (!trimmed) {
    return null;
  }

  return trimmed
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFieldValue(fields: AfripayFieldBag | undefined, key: string) {
  return getTrimmedValue(fields?.[key]);
}

function getPrioritizedValue(source: AfripaySignalInput["source"], query: AfripayFieldBag, body: AfripayFieldBag, keys: string[]) {
  const orderedBags = source === "webhook" ? [body, query] : [query, body];

  for (const bag of orderedBags) {
    for (const key of keys) {
      const value = getFieldValue(bag, key);

      if (value) {
        return value;
      }
    }
  }

  return null;
}

function maskPreviewValue(key: string, value: string) {
  if (["app_secret", "secret_key", "signature", "authorization"].includes(key)) {
    return "[redacted]";
  }

  if (["app_id", "public_key"].includes(key)) {
    return value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : "[masked]";
  }

  return value.length > 160 ? `${value.slice(0, 157)}...` : value;
}

function buildFieldPreview(fields: AfripayFieldBag | undefined) {
  if (!fields) {
    return undefined;
  }

  const entries = previewKeys
    .map((key) => {
      const value = getFieldValue(fields, key);
      return value ? [key, maskPreviewValue(key, value)] : null;
    })
    .filter((entry): entry is [string, string] => entry !== null);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

export function mapAfripayPaymentStatus(
  rawStatus: string | null | undefined,
): Extract<PaymentStatus, "paid" | "failed" | "cancelled"> | null {
  const normalized = normalizeAfripayStatus(rawStatus);

  if (!normalized) {
    return null;
  }

  if (
    [
      "paid",
      "success",
      "successful",
      "completed",
      "complete",
      "approved",
      "payment successful",
      "payment completed",
      "transaction successful",
      "transaction completed",
    ].includes(normalized)
  ) {
    return "paid";
  }

  if (["failed", "failure", "declined", "error", "payment failed", "transaction failed"].includes(normalized)) {
    return "failed";
  }

  if (["cancelled", "canceled", "abandoned", "payment cancelled", "payment canceled"].includes(normalized)) {
    return "cancelled";
  }

  return null;
}

export function resolveAfripaySignal(input: AfripaySignalInput): AfripaySignal {
  const query = input.query ?? {};
  const body = input.body ?? {};
  const reference = getPrioritizedValue(input.source, query, body, ["reference", "client_token"]);
  const rawStatus = getPrioritizedValue(input.source, query, body, ["status", "payment_status", "transaction_status", "state"]);
  const providerReference = getPrioritizedValue(input.source, query, body, ["providerReference", "provider_reference", "payment_id"]);
  const providerTransactionId = getPrioritizedValue(input.source, query, body, ["transactionId", "transaction_id", "txn_id"]);
  const failureReason = getPrioritizedValue(input.source, query, body, ["message", "error", "comment"]);

  return {
    reference,
    rawStatus,
    mappedStatus: mapAfripayPaymentStatus(rawStatus),
    providerReference,
    providerTransactionId,
    failureReason,
    safeMetadata: {
      afripaySource: input.source,
      afripayTransport: input.transport,
      rawStatus,
      queryKeys: Object.keys(query).sort(),
      bodyKeys: Object.keys(body).sort(),
      queryPreview: buildFieldPreview(query),
      bodyPreview: buildFieldPreview(body),
    },
  };
}

export function isAfripayWebhookSecretValid(configuredSecret: string | null | undefined, providedSecret: string | null | undefined) {
  if (!configuredSecret) {
    return true;
  }

  const normalizedProvidedSecret = providedSecret?.trim() ?? "";
  const providedBuffer = Buffer.from(normalizedProvidedSecret);
  const expectedBuffer = Buffer.from(configuredSecret);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
