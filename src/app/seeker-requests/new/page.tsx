import Link from "next/link";

import { PaymentReturnNotice } from "@/components/payments/payment-return-notice";
import { SeekerRequestForm } from "@/components/seeker-requests/seeker-request-form";
import { requireSession } from "@/lib/auth/session";
import { getFeeSettingsSummary } from "@/lib/fee-settings/workflow";
import { getSingleSearchParam, parsePaymentReturnStatus } from "@/lib/payments/search-params";

export default async function NewSeekerRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string | string[]; paymentReference?: string | string[] }>;
}) {
  await requireSession({ roles: ["buyer"] });
  const resolvedSearchParams = await searchParams;
  const feeSettings = await getFeeSettingsSummary();
  const paymentStatus = parsePaymentReturnStatus(resolvedSearchParams.payment);
  const paymentReference = getSingleSearchParam(resolvedSearchParams.paymentReference);

  return (
    <main className="page-shell mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <section className="hero-shell px-6 py-7 md:px-8 md:py-8">
        <div className="grid gap-8 md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 text-white">
            <p className="eyebrow text-[var(--primary-light)]">Buyer request board</p>
            <h1 className="font-[var(--font-display)] text-4xl leading-tight md:text-5xl">
              Post what you need and let the right owner come to you.
            </h1>
            <p className="max-w-3xl text-base leading-8 text-[rgba(232,237,235,0.82)]">
              Use seeker requests when the right listing is missing or buried. The public board stays anonymized, your
              contact details stay hidden, and the request only goes live after the posting payment settles.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/seeker-requests" className="pill-button pill-button-primary">
                Browse seeker board
              </Link>
              <Link href="/dashboard" className="pill-button pill-button-outline">
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="hero-panel p-6 text-white">
            <p className="eyebrow text-[var(--primary-light)]">How it works</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-[rgba(255,255,255,0.86)]">
              <div className="rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] p-4">
                Owners see your category, budget range, location, and need summary.
              </div>
              <div className="rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] p-4">
                Your name and phone remain hidden from the public board.
              </div>
              <div className="rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] p-4">
                A checkout is created first, and the request publishes only after the payment is confirmed.
              </div>
            </div>
          </div>
        </div>
      </section>

      {paymentStatus ? (
        <section className="surface-card p-4">
          <PaymentReturnNotice
            status={paymentStatus}
            reference={paymentReference}
            subject="Seeker request posting"
            bodyOverride={
              paymentStatus === "paid"
                ? "The posting payment settled successfully and the seeker request is now live."
                : paymentStatus === "pending"
                  ? "The gateway returned without a final status. Your request will stay unpublished until the payment is confirmed or manually reviewed."
                  : paymentStatus === "failed"
                    ? "The posting fee did not complete, so the seeker request was not published."
                    : "The posting flow was cancelled before settlement, so the seeker request was not published."
            }
          />
        </section>
      ) : null}

      <section className="surface-card p-6 md:p-8">
        <SeekerRequestForm feeSettings={feeSettings} />
      </section>
    </main>
  );
}
