import { getServerEnv, maskSecret } from "@/lib/env";
import type { PaymentStatus } from "@/lib/domain";

type AfripayAppCredentials = {
  mode: "app_credentials";
  appId: string;
  appSecret: string;
};

type AfripayKeyPairCredentials = {
  mode: "key_pair";
  publicKey: string;
  secretKey: string;
};

type MissingAfripayCredentials = {
  mode: "missing";
};

export type AfripayCredentials =
  | AfripayAppCredentials
  | AfripayKeyPairCredentials
  | MissingAfripayCredentials;

export type AfripayGatewayProbe = {
  url: string;
  reachable: boolean;
  statusCode: number | null;
  finalUrl: string | null;
  contentType: string | null;
  authChecked: false;
  merchantContractConfigured: false;
  error: string | null;
};

const defaultAfripayGatewayUrl = "https://www.afripay.africa/checkout/index.php";

export function getAfripayCredentials(): AfripayCredentials {
  const env = getServerEnv();

  if (env.AFRIPAY_APP_ID && env.AFRIPAY_APP_SECRET) {
    return {
      mode: "app_credentials",
      appId: env.AFRIPAY_APP_ID,
      appSecret: env.AFRIPAY_APP_SECRET,
    };
  }

  if (env.AFRIPAY_PUBLIC_KEY && env.AFRIPAY_SECRET_KEY) {
    return {
      mode: "key_pair",
      publicKey: env.AFRIPAY_PUBLIC_KEY,
      secretKey: env.AFRIPAY_SECRET_KEY,
    };
  }

  return {
    mode: "missing",
  };
}

export function assertAfripayServerCredentials() {
  const credentials = getAfripayCredentials();

  if (credentials.mode === "missing") {
    throw new Error(
      "AfrIPay live mode requires server-side credentials. Configure AFRIPAY_APP_ID and AFRIPAY_APP_SECRET, or the legacy AFRIPAY_PUBLIC_KEY and AFRIPAY_SECRET_KEY pair.",
    );
  }

  return credentials;
}

export function getAfripayGatewayUrl() {
  const env = getServerEnv();

  return env.AFRIPAY_GATEWAY_URL ?? defaultAfripayGatewayUrl;
}

export function getAfripayConfigStatus() {
  const env = getServerEnv();
  const credentials = getAfripayCredentials();

  return {
    providerMode: env.PAYMENT_PROVIDER_MODE,
    gatewayUrl: getAfripayGatewayUrl(),
    credentialMode: credentials.mode,
    appId: credentials.mode === "app_credentials" ? maskSecret(credentials.appId) : null,
    publicKey: credentials.mode === "key_pair" ? maskSecret(credentials.publicKey) : null,
    webhookSecretConfigured: Boolean(env.AFRIPAY_WEBHOOK_SECRET),
    serverCredentialsConfigured: credentials.mode !== "missing",
    checkoutContract: "legacy_form_post",
    liveCheckoutImplemented: true,
  };
}

export async function probeAfripayGateway(): Promise<AfripayGatewayProbe> {
  const url = getAfripayGatewayUrl();

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
    });

    return {
      url,
      reachable: response.ok,
      statusCode: response.status,
      finalUrl: response.url,
      contentType: response.headers.get("content-type"),
      authChecked: false,
      merchantContractConfigured: false,
      error: response.ok ? null : `Gateway returned HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      url,
      reachable: false,
      statusCode: null,
      finalUrl: null,
      contentType: null,
      authChecked: false,
      merchantContractConfigured: false,
      error: error instanceof Error ? error.message : "Unknown AfrIPay gateway probe error",
    };
  }
}

export function mapAfripayPaymentStatus(rawStatus: string | null | undefined): Extract<PaymentStatus, "paid" | "failed" | "cancelled"> | null {
  const normalized = rawStatus?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["paid", "success", "successful", "completed", "complete"].includes(normalized)) {
    return "paid";
  }

  if (["failed", "failure", "declined", "error"].includes(normalized)) {
    return "failed";
  }

  if (["cancelled", "canceled", "abandoned"].includes(normalized)) {
    return "cancelled";
  }

  return null;
}
