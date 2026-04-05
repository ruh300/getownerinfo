import { CommissionCaseActions } from "@/components/admin/commission-case-actions";
import { InvestigationCaseLauncher } from "@/components/admin/investigation-case-launcher";
import type { AdminCommissionOverviewData } from "@/lib/commissions/workflow";
import { formatRwf } from "@/lib/formatting/currency";
import { formatDate, formatDateTime } from "@/lib/formatting/date";
import { getCategoryLabel, humanizeEnum } from "@/lib/formatting/text";

type CommissionOverviewProps = {
  overview: AdminCommissionOverviewData;
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

export function CommissionOverview({ overview, canManage, canOpenInvestigations }: CommissionOverviewProps) {
  return (
    <section id="commissions" className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Commission control</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl">Model A invoices and overdue tracking</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Review outstanding Model A commission cases, follow overdue accounts, and reconcile settled or waived invoices.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-4">
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Outstanding</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{formatRwf(overview.stats.outstandingAmountRwf)}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Current due and overdue commission balance.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Overdue</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.overdueCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{formatRwf(overview.stats.overdueAmountRwf)} currently overdue.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Paid</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.paidCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Commission cases manually or automatically settled.</p>
        </article>
        <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Waived</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl">{overview.stats.waivedCount}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Cases closed by admin exception.</p>
        </article>
      </section>

      {overview.cases.length === 0 ? (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          No commission cases exist yet. They will appear when Model A listings are marked sold or rented.
        </div>
      ) : (
        <div className="grid gap-4">
          {overview.cases.map((commissionCase) => (
            <article
              key={commissionCase.id}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                    {getCategoryLabel(commissionCase.category)}
                  </p>
                  <h3 className="mt-2 font-[var(--font-display)] text-2xl">{commissionCase.listingTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Owner: {commissionCase.ownerName} {commissionCase.ownerRole ? `(${commissionCase.ownerRole})` : ""}
                  </p>
                </div>
                <div
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusBadgeClassName(commissionCase.effectiveStatus)}`}
                >
                  {humanizeEnum(commissionCase.effectiveStatus)}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Outcome</p>
                  <p>{humanizeEnum(commissionCase.outcomeStatus)}</p>
                  <p>Reported amount: {formatRwf(commissionCase.finalAmountRwf)}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Commission</p>
                  <p>{formatRwf(commissionCase.commissionAmountRwf)}</p>
                  <p>Due {formatDate(commissionCase.dueAt)}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Settlement</p>
                  <p>{commissionCase.settledAt ? formatDateTime(commissionCase.settledAt) : "Awaiting settlement"}</p>
                  <p>{commissionCase.paymentReference ?? "No payment reference yet"}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">Created</p>
                  <p>{formatDateTime(commissionCase.createdAt)}</p>
                  <p>{commissionCase.statusNote ?? "No admin note yet"}</p>
                </div>
              </div>

              <CommissionCaseActions
                commissionCaseId={commissionCase.id}
                currentStatus={commissionCase.status}
                canManage={canManage}
              />
              <InvestigationCaseLauncher
                entityType="commission_case"
                entityId={commissionCase.id}
                defaultCaseType="deal_verification"
                canManage={canOpenInvestigations}
                label="Open commission investigation"
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
