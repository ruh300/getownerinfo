import { FeeSettingsPanel } from "@/components/admin/fee-settings-panel";
import Link from "next/link";

import { AuditExplorer } from "@/components/admin/audit-explorer";
import { CommissionOverview } from "@/components/admin/commission-overview";
import { InvestigationOverview } from "@/components/admin/investigation-overview";
import { PaymentOverview } from "@/components/admin/payment-overview";
import { PenaltyOverview } from "@/components/admin/penalty-overview";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { ReviewBoard } from "@/components/admin/review-board";
import { getAdminAuditExplorerData, parseAdminAuditExplorerFilters } from "@/lib/admin/audit-explorer";
import { getAdminPaymentExplorerData, parseAdminPaymentExplorerFilters } from "@/lib/admin/payment-explorer";
import { requireSession } from "@/lib/auth/session";
import { adminRoles, canConfigureFees } from "@/lib/auth/types";
import { getAdminCommissionOverviewData } from "@/lib/commissions/workflow";
import { getFeeSettingsSummary } from "@/lib/fee-settings/workflow";
import {
  getAdminInvestigationOverviewData,
  parseAdminInvestigationExplorerFilters,
} from "@/lib/investigations/workflow";
import { getAdminWorkspaceData } from "@/lib/listings/workflow";
import { getNotificationCenterForSession } from "@/lib/notifications/workflow";
import { getAdminPenaltyOverviewData } from "@/lib/penalties/workflow";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    entityType?: string | string[];
    actorRole?: string | string[];
    action?: string | string[];
    query?: string | string[];
    limit?: string | string[];
    paymentStatus?: string | string[];
    paymentPurpose?: string | string[];
    paymentQuery?: string | string[];
    paymentLimit?: string | string[];
    investigationStatus?: string | string[];
    investigationType?: string | string[];
    investigationPriority?: string | string[];
    investigationQuery?: string | string[];
    investigationLimit?: string | string[];
  }>;
}) {
  const session = await requireSession({
    roles: adminRoles,
    redirectTo: "/sign-in?next=/admin",
  });
  const canManageInvestigations = adminRoles.includes(session.user.role);
  const resolvedSearchParams = await searchParams;
  const auditFilters = parseAdminAuditExplorerFilters(resolvedSearchParams);
  const paymentFilters = parseAdminPaymentExplorerFilters(resolvedSearchParams);
  const investigationFilters = parseAdminInvestigationExplorerFilters(resolvedSearchParams);
  let workspace: Awaited<ReturnType<typeof getAdminWorkspaceData>> | null = null;
  let paymentOverview: Awaited<ReturnType<typeof getAdminPaymentExplorerData>> | null = null;
  let commissionOverview: Awaited<ReturnType<typeof getAdminCommissionOverviewData>> | null = null;
  let investigationOverview: Awaited<ReturnType<typeof getAdminInvestigationOverviewData>> | null = null;
  let penaltyOverview: Awaited<ReturnType<typeof getAdminPenaltyOverviewData>> | null = null;
  let auditExplorer: Awaited<ReturnType<typeof getAdminAuditExplorerData>> | null = null;
  let feeSettings: Awaited<ReturnType<typeof getFeeSettingsSummary>> | null = null;
  let notificationCenter: Awaited<ReturnType<typeof getNotificationCenterForSession>> | null = null;
  let workspaceError: string | null = null;
  let paymentError: string | null = null;
  let commissionError: string | null = null;
  let investigationError: string | null = null;
  let penaltyError: string | null = null;
  let auditError: string | null = null;
  let feeSettingsError: string | null = null;
  let notificationError: string | null = null;

  const [workspaceResult, paymentResult, commissionResult, investigationResult, penaltyResult, auditResult, feeSettingsResult, notificationResult] = await Promise.allSettled([
    getAdminWorkspaceData(),
    getAdminPaymentExplorerData(paymentFilters),
    getAdminCommissionOverviewData(),
    getAdminInvestigationOverviewData(investigationFilters),
    getAdminPenaltyOverviewData(),
    getAdminAuditExplorerData(auditFilters),
    getFeeSettingsSummary(),
    getNotificationCenterForSession(session),
  ]);

  if (workspaceResult.status === "fulfilled") {
    workspace = workspaceResult.value;
  } else {
    workspaceError =
      workspaceResult.reason instanceof Error
        ? workspaceResult.reason.message
        : "Could not load the admin review workspace.";
  }

  if (paymentResult.status === "fulfilled") {
    paymentOverview = paymentResult.value;
  } else {
    paymentError =
      paymentResult.reason instanceof Error
        ? paymentResult.reason.message
        : "Could not load admin payment analytics.";
  }

  if (commissionResult.status === "fulfilled") {
    commissionOverview = commissionResult.value;
  } else {
    commissionError =
      commissionResult.reason instanceof Error
        ? commissionResult.reason.message
        : "Could not load admin commission analytics.";
  }

  if (investigationResult.status === "fulfilled") {
    investigationOverview = investigationResult.value;
  } else {
    investigationError =
      investigationResult.reason instanceof Error
        ? investigationResult.reason.message
        : "Could not load investigation cases.";
  }

  if (penaltyResult.status === "fulfilled") {
    penaltyOverview = penaltyResult.value;
  } else {
    penaltyError =
      penaltyResult.reason instanceof Error
        ? penaltyResult.reason.message
        : "Could not load admin penalty analytics.";
  }

  if (auditResult.status === "fulfilled") {
    auditExplorer = auditResult.value;
  } else {
    auditError =
      auditResult.reason instanceof Error
        ? auditResult.reason.message
        : "Could not load admin audit explorer data.";
  }

  if (feeSettingsResult.status === "fulfilled") {
    feeSettings = feeSettingsResult.value;
  } else {
    feeSettingsError =
      feeSettingsResult.reason instanceof Error
        ? feeSettingsResult.reason.message
        : "Could not load fee settings.";
  }

  if (notificationResult.status === "fulfilled") {
    notificationCenter = notificationResult.value;
  } else {
    notificationError =
      notificationResult.reason instanceof Error
        ? notificationResult.reason.message
        : "Could not load admin notifications.";
  }

  return (
    <main className="page-shell mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <section className="hero-shell p-8 text-white">
        <p className="eyebrow text-[var(--primary-light)]">Admin workspace</p>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl leading-tight md:text-5xl">
          Operations view for {session.user.role}.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[rgba(255,255,255,0.84)]">
          Reviews, payment reconciliation, investigations, penalties, commissions, and fee controls all converge here
          so the marketplace can operate with one consistent governance surface.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="pill-button pill-button-primary">
            Back to dashboard
          </Link>
          <Link href="/api/status" className="pill-button pill-button-outline">
            Check integrations
          </Link>
        </div>
      </section>

      {workspaceError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load live admin data: {workspaceError}
        </section>
      ) : null}

      {paymentError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load admin payment data: {paymentError}
        </section>
      ) : null}

      {commissionError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load admin commission data: {commissionError}
        </section>
      ) : null}

      {penaltyError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load admin penalty data: {penaltyError}
        </section>
      ) : null}

      {investigationError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load investigation cases: {investigationError}
        </section>
      ) : null}

      {auditError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load audit explorer data: {auditError}
        </section>
      ) : null}

      {feeSettingsError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load fee settings: {feeSettingsError}
        </section>
      ) : null}

      {notificationError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load admin notifications: {notificationError}
        </section>
      ) : null}

      {notificationCenter ? (
        <NotificationCenter
          center={notificationCenter}
          eyebrow="Alerts"
          title="Admin notifications"
          emptyMessage="No admin notifications yet. New review submissions, seeker demand, and owner-side events will appear here."
        />
      ) : null}

      {workspace ? (
        <>
          <section className="grid gap-6 md:grid-cols-4">
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Pending</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{workspace.stats.pendingCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Listings currently waiting for action.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Active</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{workspace.stats.activeCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Listings approved and live to buyers.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Rejected</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{workspace.stats.rejectedCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Listings sent back for correction.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Total</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl">{workspace.stats.totalListingCount}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">All submitted listings tracked in the workflow.</p>
            </article>
          </section>

          <ReviewBoard
            reviewQueue={workspace.reviewQueue}
            recentDecisions={workspace.recentDecisions}
            recentActivity={workspace.recentActivity}
          />
        </>
      ) : null}

      {paymentOverview ? (
        <PaymentOverview
          overview={paymentOverview}
          canManagePayments={canConfigureFees(session.user.role)}
          canOpenInvestigations={canManageInvestigations}
          preservedAuditFilters={auditFilters}
          preservedInvestigationFilters={investigationFilters}
        />
      ) : null}

      {commissionOverview ? (
        <CommissionOverview
          overview={commissionOverview}
          canManage={canConfigureFees(session.user.role)}
          canOpenInvestigations={canManageInvestigations}
        />
      ) : null}

      {investigationOverview ? (
        <InvestigationOverview
          overview={investigationOverview}
          canManage={canManageInvestigations}
          preservedAuditFilters={auditFilters}
          preservedPaymentFilters={paymentFilters}
        />
      ) : null}

      {penaltyOverview ? (
        <PenaltyOverview
          overview={penaltyOverview}
          canManage={canConfigureFees(session.user.role)}
          canOpenInvestigations={canManageInvestigations}
        />
      ) : null}

      {auditExplorer ? (
        <AuditExplorer
          explorer={auditExplorer}
          preservedPaymentFilters={paymentFilters}
          preservedInvestigationFilters={investigationFilters}
        />
      ) : null}

      {feeSettings ? <FeeSettingsPanel settings={feeSettings} canEdit={canConfigureFees(session.user.role)} /> : null}
    </main>
  );
}
