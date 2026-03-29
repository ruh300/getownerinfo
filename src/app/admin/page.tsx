import Link from "next/link";

import { requireSession } from "@/lib/auth/session";
import { adminRoles } from "@/lib/auth/types";

const reviewLanes = [
  "Ownership proof review queue",
  "Listing activation and rejection decisions",
  "Penalty and token rule oversight",
  "Audit log and exception follow-up",
];

export default async function AdminPage() {
  const session = await requireSession({
    roles: adminRoles,
    redirectTo: "/sign-in?next=/admin",
  });

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

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {reviewLanes.map((lane) => (
          <article
            key={lane}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Admin lane</p>
            <h2 className="mt-3 font-[var(--font-display)] text-2xl">{lane}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              This card is the placeholder hook for the next implementation pass, when we add real review data and moderation actions.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
