import type { PaymentReturnStatus } from "@/lib/payments/search-params";

type PaymentReturnNoticeProps = {
  status: PaymentReturnStatus;
  reference?: string | null;
  subject: string;
  bodyOverride?: string;
};

const noticeStyles: Record<
  PaymentReturnStatus,
  {
    border: string;
    background: string;
    heading: string;
    body: string;
  }
> = {
  pending: {
    border: "border-[rgba(200,134,10,0.24)]",
    background: "bg-[rgba(200,134,10,0.08)] text-[#9f6908]",
    heading: "Payment pending",
    body: "The gateway returned without a final status. Access will stay locked until the payment is confirmed or manually reviewed.",
  },
  paid: {
    border: "border-[rgba(26,122,74,0.24)]",
    background: "bg-[rgba(26,122,74,0.08)] text-[var(--primary)]",
    heading: "Payment confirmed",
    body: "The checkout settled successfully. The page is now using the latest access state for this unlock.",
  },
  failed: {
    border: "border-[rgba(184,50,50,0.2)]",
    background: "bg-[rgba(184,50,50,0.08)] text-[#9c2d2d]",
    heading: "Payment failed",
    body: "The checkout did not complete. You can start a fresh payment attempt whenever you are ready.",
  },
  cancelled: {
    border: "border-[rgba(200,134,10,0.24)]",
    background: "bg-[rgba(200,134,10,0.08)] text-[#9f6908]",
    heading: "Payment cancelled",
    body: "The checkout was cancelled before settlement, so access was not granted.",
  },
};

export function PaymentReturnNotice({ status, reference, subject, bodyOverride }: PaymentReturnNoticeProps) {
  const styles = noticeStyles[status];

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${styles.border} ${styles.background}`}>
      <p className="font-semibold">{styles.heading}</p>
      <p className="mt-1">
        {subject}: {bodyOverride ?? styles.body}
      </p>
      {reference ? <p className="mt-2 text-xs uppercase tracking-[0.12em] opacity-80">Reference {reference}</p> : null}
    </div>
  );
}
