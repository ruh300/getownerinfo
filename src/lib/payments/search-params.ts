import type { PaymentStatus } from "@/lib/domain";

type SearchParamValue = string | string[] | undefined;

export type PaymentReturnStatus = PaymentStatus;

export function getSingleSearchParam(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function parsePaymentReturnStatus(value: SearchParamValue): PaymentReturnStatus | null {
  const resolvedValue = getSingleSearchParam(value);

  if (resolvedValue === "pending" || resolvedValue === "paid" || resolvedValue === "failed" || resolvedValue === "cancelled") {
    return resolvedValue;
  }

  return null;
}
