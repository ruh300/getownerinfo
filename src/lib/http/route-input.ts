import type { NextRequest } from "next/server";

export class RouteInputError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "RouteInputError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonObjectBody(request: NextRequest) {
  try {
    const payload = (await request.json()) as unknown;

    if (!isRecord(payload)) {
      throw new RouteInputError("Request body must be a JSON object.");
    }

    return payload;
  } catch (error) {
    if (error instanceof RouteInputError) {
      throw error;
    }

    throw new RouteInputError("Request body must be valid JSON.");
  }
}

export function getOptionalTrimmedString(body: Record<string, unknown>, key: string) {
  const value = body[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function getRequiredTrimmedString(
  body: Record<string, unknown>,
  key: string,
  options?: {
    minLength?: number;
    message?: string;
  },
) {
  const value = getOptionalTrimmedString(body, key);
  const minLength = options?.minLength ?? 1;

  if (!value || value.length < minLength) {
    throw new RouteInputError(options?.message ?? `Provide a valid ${key}.`);
  }

  return value;
}

export function getOptionalNumber(body: Record<string, unknown>, key: string) {
  const value = body[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function getEnumValue<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  message: string,
): T[number] {
  if (typeof value === "string" && allowedValues.includes(value)) {
    return value as T[number];
  }

  throw new RouteInputError(message);
}

export function getRouteErrorResponse(error: unknown, fallbackMessage: string, fallbackStatusCode = 400) {
  if (error instanceof RouteInputError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
    };
  }

  return {
    statusCode: fallbackStatusCode,
    message: error instanceof Error ? error.message : fallbackMessage,
    details: undefined,
  };
}
