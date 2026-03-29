import Link from "next/link";

import { ReviewBoard } from "@/components/admin/review-board";
import { requireSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";
import { getAdminWorkspaceData } from "@/lib/listings/workflow";

export default async function AdminPage() {
  const session = await requireSession({
    roles: adminRoles,
    redirectTo: "/sign-in?next=/admin",
  });
  let workspace: Awaited<ReturnType<typeof getAdminWorkspaceData>> | null = null;
  let workspaceError: string | null = null;

  try {
    workspace = await getAdminWorkspaceData();
  } catch (error) {
    workspaceError = error instanceof Error ? error.message : "Could not load the admin review workspace.";
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <section className="rounded-[30px] border border-[rgba(26,77,46,0.14)] bg-[linear-gradient(180deg,rgba(26,77,46,0.98),rgba(20,92,56,1))] p-8 text-white shadow-[0_24px_80px_rgba(26,77,46,0.2)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.72)]">Admin workspace</p>
        <h1 className="mt-4 font-[var(--font-display)] text-4xl leading-tight md:text-5xl">
          Operations view for {session.user.role}.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[rgba(255,255,255,0.84)]">
          This route is now protected separately from the general dashboard so we can keep review, approvals, and governance tools isolated from public or buyer-only flows.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[rgba(255,255,255,0.9)]"
          >
            Back to dashboard
          </Link>
          <Link
            href="/api/status"
            className="rounded-full border border-[rgba(255,255,255,0.26)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[rgba(255,255,255,0.08)]"
          >
            Check integrations
          </Link>
        </div>
      </section>

      {workspaceError ? (
        <section className="rounded-[24px] border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-5 py-4 text-sm leading-6 text-[#9c2d2d]">
          Could not load live admin data: {workspaceError}
        </section>
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
    </main>
  );
}
