import Link from "next/link";
import { notFound } from "next/navigation";

import { AfripayPaymentCheckout } from "@/components/payments/afripay-payment-checkout";
import { MockPaymentCheckout } from "@/components/payments/mock-payment-checkout";
import { requireSession } from "@/lib/auth/session";
import { getPaymentCheckoutDataForSession } from "@/lib/payments/workflow";

export default async function PaymentCheckoutPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const session = await requireSession();
  const { reference } = await params;
  let checkout: Awaited<ReturnType<typeof getPaymentCheckoutDataForSession>> | null = null;

  try {
    checkout = await getPaymentCheckoutDataForSession(session, reference);
  } catch {
    checkout = null;
  }

  if (!checkout) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <div className="space-y-3">
        <Link
          href={checkout.returnPath}
          className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary-light)]"
        >
          Back to the linked item
        </Link>
      </div>

      {checkout.checkoutMode === "afripay" ? (
        <AfripayPaymentCheckout checkout={checkout} />
      ) : (
        <MockPaymentCheckout checkout={checkout} />
      )}
    </main>
  );
}
