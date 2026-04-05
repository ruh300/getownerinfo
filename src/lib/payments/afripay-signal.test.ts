import test from "node:test";
import assert from "node:assert/strict";

import {
  isAfripayWebhookSecretValid,
  mapAfripayPaymentStatus,
  resolveAfripaySignal,
} from "@/lib/payments/afripay-signal";

test("mapAfripayPaymentStatus handles normalized success, failure, and cancellation values", () => {
  assert.equal(mapAfripayPaymentStatus("SUCCESSFUL"), "paid");
  assert.equal(mapAfripayPaymentStatus("payment_successful"), "paid");
  assert.equal(mapAfripayPaymentStatus("approved"), "paid");
  assert.equal(mapAfripayPaymentStatus("DECLINED"), "failed");
  assert.equal(mapAfripayPaymentStatus("transaction_failed"), "failed");
  assert.equal(mapAfripayPaymentStatus("abandoned"), "cancelled");
  assert.equal(mapAfripayPaymentStatus("pending"), null);
});

test("resolveAfripaySignal prefers callback query fields and keeps safe previews", () => {
  const signal = resolveAfripaySignal({
    source: "callback",
    transport: "form",
    query: {
      reference: "PAY-123",
      status: "successful",
      amount: "4000",
      currency: "RWF",
    },
    body: {
      client_token: "ALT-999",
      transaction_id: "txn-1",
      app_secret: "super-secret-value",
    },
  });

  assert.equal(signal.reference, "PAY-123");
  assert.equal(signal.mappedStatus, "paid");
  assert.equal(signal.providerTransactionId, "txn-1");
  assert.deepEqual(signal.safeMetadata.queryKeys, ["amount", "currency", "reference", "status"]);
  assert.deepEqual(signal.safeMetadata.bodyKeys, ["app_secret", "client_token", "transaction_id"]);
  assert.deepEqual(signal.safeMetadata.bodyPreview, {
    app_secret: "[redacted]",
    client_token: "ALT-999",
    transaction_id: "txn-1",
  });
});

test("resolveAfripaySignal prefers webhook body fields and records unknown statuses safely", () => {
  const signal = resolveAfripaySignal({
    source: "webhook",
    transport: "json",
    body: {
      client_token: "SEEK-123",
      state: "processing",
      provider_reference: "gateway-42",
      message: "Awaiting manual capture",
      app_id: "0e5c02083729de6f4878755fe64707f7",
    },
    query: {
      reference: "IGNORED-QUERY",
      status: "success",
    },
  });

  assert.equal(signal.reference, "SEEK-123");
  assert.equal(signal.rawStatus, "processing");
  assert.equal(signal.mappedStatus, null);
  assert.equal(signal.providerReference, "gateway-42");
  assert.equal(signal.failureReason, "Awaiting manual capture");
  assert.deepEqual(signal.safeMetadata.bodyPreview, {
    app_id: "0e5c…07f7",
    client_token: "SEEK-123",
    message: "Awaiting manual capture",
    provider_reference: "gateway-42",
    state: "processing",
  });
});

test("isAfripayWebhookSecretValid compares secrets safely and allows missing configuration", () => {
  assert.equal(isAfripayWebhookSecretValid(undefined, null), true);
  assert.equal(isAfripayWebhookSecretValid("shared-secret", "shared-secret"), true);
  assert.equal(isAfripayWebhookSecretValid("shared-secret", "wrong-secret"), false);
  assert.equal(isAfripayWebhookSecretValid("shared-secret", null), false);
});
