type RequiredServerEnv = {
  AUTH_SESSION_SECRET: string;
  MONGODB_URI: string;
  MONGODB_DB: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
};

type ServerEnv = RequiredServerEnv & {
  NEXT_PUBLIC_APP_URL: string | null;
  PAYMENT_PROVIDER_MODE: "mock" | "afripay";
  AFRIPAY_GATEWAY_URL: string | null;
  AFRIPAY_APP_ID: string | null;
  AFRIPAY_APP_SECRET: string | null;
  AFRIPAY_PUBLIC_KEY: string | null;
  AFRIPAY_SECRET_KEY: string | null;
  AFRIPAY_WEBHOOK_SECRET: string | null;
};

let cachedEnv: ServerEnv | null = null;

function getRequiredEnv(name: keyof RequiredServerEnv): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const paymentProviderMode = process.env.PAYMENT_PROVIDER_MODE === "afripay" ? "afripay" : "mock";

  cachedEnv = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    PAYMENT_PROVIDER_MODE: paymentProviderMode,
    AFRIPAY_GATEWAY_URL: process.env.AFRIPAY_GATEWAY_URL ?? null,
    AFRIPAY_APP_ID: process.env.AFRIPAY_APP_ID ?? null,
    AFRIPAY_APP_SECRET: process.env.AFRIPAY_APP_SECRET ?? null,
    AFRIPAY_PUBLIC_KEY: process.env.AFRIPAY_PUBLIC_KEY ?? null,
    AFRIPAY_SECRET_KEY: process.env.AFRIPAY_SECRET_KEY ?? null,
    AFRIPAY_WEBHOOK_SECRET: process.env.AFRIPAY_WEBHOOK_SECRET ?? null,
    AUTH_SESSION_SECRET: getRequiredEnv("AUTH_SESSION_SECRET"),
    MONGODB_URI: getRequiredEnv("MONGODB_URI"),
    MONGODB_DB: getRequiredEnv("MONGODB_DB"),
    CLOUDINARY_CLOUD_NAME: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
    CLOUDINARY_API_KEY: getRequiredEnv("CLOUDINARY_API_KEY"),
    CLOUDINARY_API_SECRET: getRequiredEnv("CLOUDINARY_API_SECRET"),
  };

  return cachedEnv;
}

export function maskSecret(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars) {
    return "*".repeat(value.length);
  }

  return `${"*".repeat(Math.max(value.length - visibleChars, 0))}${value.slice(-visibleChars)}`;
}
