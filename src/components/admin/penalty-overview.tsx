import { PenaltyCaseActions } from "@/components/admin/penalty-case-actions";
import { InvestigationCaseLauncher } from "@/components/admin/investigation-case-launcher";
import type { AdminPenaltyOverviewData } from "@/lib/penalties/workflow";
import { formatRwf } from "@/lib/formatting/currency";
import { formatDate, formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";

type PenaltyOverviewProps = {
  overview: AdminPenaltyOverviewData;
  canManage: boolean;
  canOpenInvestigations: boolean;
};

function getStatusBadgeClassName(status: string) {
  switch (status) {
    case "overdue":
      return "border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] text-[#9c2d2d]";
    case "paid":
      return "border-[rgba(26,122,74,0.18)] bg-[rgba(26,122,74,0.08)] text-[var(--primary)]";
    case "waived":
      return "border-[rgba(84,92,108,0.18)] bg-[rgba(84,92,108,0.08)] text-[#4b5563]";
    default:
      return "border-[rgba(200,134,10,0.18)] bg-[rgba(200,134,10,0.08)] text-[var(--accent)]";
  }
}

export function PenaltyOverview({ overview, canManage, canOpenInvestigations }: PenaltyOverviewProps) {
  return (
    <section id="penalties" className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Penalty control</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl">Unpaid-balance enforcement</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Review penalties created from overdue commission or future violation engines, then reconcile them without editing Mongo records directly.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-4">
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Unpaid</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{formatRwf(overview.stats.unpaidAmountRwf)}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Current due and overdue penalty balance.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Due</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.dueCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Penalty records waiting to be settled.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Overdue</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.overdueCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Penalties that passed their own due date.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Paid / Waived</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.paidCount + overview.stats.waivedCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Resolved penalty records.</p>
        </article>
      </section>

      {overview.penalties.length === 0 ? (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          No penalties exist yet. Auto-generated penalties will appear here once an overdue commission is detected.
        </div>
      ) : (
        <div className="grid gap-4">
          {overview.penalties.map((penalty) => (
            <article
              key={penalty.id}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                    {humanizeEnum(penalty.offenseType)}
                  </p>
                  <h3 className="mt-2 font-[var(--font-display)] text-2xl">{penalty.listingTitle ?? "Account-level penalty"}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Owner: {penalty.ownerName} {penalty.ownerRole ? `(${penalty.ownerRole})` : ""}
                  </p>
                </div>
                <div
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusBadgeClassName(penalty.effectiveStatus)}`}
                >
                  {humanizeEnum(penalty.effectiveStatus)}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Reason</p>
                  <p>{penalty.reason}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Penalty amount</p>
                  <p>{formatRwf(penalty.penaltyAmountRwf)}</p>
                  <p>Due {formatDate(penalty.dueAt)}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Settlement</p>
                  <p>{penalty.settledAt ? formatDateTime(penalty.settledAt) : "Awaiting settlement"}</p>
                  <p>{penalty.paymentReference ?? "No payment reference yet"}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Case note</p>
                  <p>{penalty.statusNote ?? "No admin note yet"}</p>
                  <p>Created {formatDateTime(penalty.createdAt)}</p>
                </div>
              </div>

              <PenaltyCaseActions
                penaltyId={penalty.id}
                currentStatus={penalty.status}
                currentAmountRwf={penalty.penaltyAmountRwf}
                canManage={canManage}
              />
              <InvestigationCaseLauncher
                entityType="penalty"
                entityId={penalty.id}
                defaultCaseType="suspicious_activity"
                canManage={canOpenInvestigations}
                label="Open penalty investigation"
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
