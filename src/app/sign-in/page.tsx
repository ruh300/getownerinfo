import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import { getCurrentSession } from "@/lib/auth/session";
import { getDefaultRedirectForRole } from "@/lib/auth/types";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const session = await getCurrentSession();

  if (session) {
    redirect(getDefaultRedirectForRole(session.user.role));
  }

  const params = await searchParams;
  const nextCandidate = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = sanitizeRedirectPath(nextCandidate, "/dashboard");

  return (
    <main className="page-shell mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="dark-card p-8">
          <p className="eyebrow text-[var(--primary-light)]">Protected workspace</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl leading-tight">
            Choose the role view you want to enter.
          </h1>
          <p className="mt-4 text-base leading-7 text-[rgba(232,237,235,0.84)]">
            Owners, buyers, managers, and admins all branch into different experiences from the same app. This sign-in
            flow opens the right workspace immediately so you can test the live product paths end to end.
          </p>
          <div className="mt-8 space-y-4 text-sm leading-6 text-[rgba(255,255,255,0.88)]">
            <div className="hero-panel p-4">
              Owners and managers can create listing drafts, upload proof, and monitor inquiries.
            </div>
            <div className="hero-panel p-4">
              Buyers can browse listings, post seeker demand, and follow payment-linked unlock history.
            </div>
            <div className="hero-panel p-4">
              Admin and manager roles unlock approvals, investigations, fee controls, and audit visibility.
            </div>
          </div>
        </div>

        <section className="surface-card p-8">
          <p className="eyebrow text-[var(--primary)]">Session setup</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--foreground)]">
            Enter the contact details for this session.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            After sign-in, the app routes you to the correct workspace and reuses the contact details where it helps
            with listing creation, buyer follow-up, and audit trails.
          </p>

          <div className="mt-6">
            <SignInForm nextPath={nextPath} />
          </div>
        </section>
      </section>
    </main>
  );
}
