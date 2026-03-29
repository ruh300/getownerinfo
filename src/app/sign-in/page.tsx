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
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[30px] border border-[rgba(26,77,46,0.14)] bg-[linear-gradient(180deg,rgba(26,77,46,0.98),rgba(20,92,56,1))] p-8 text-white shadow-[0_24px_80px_rgba(26,77,46,0.2)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.72)]">Protected workspace</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl leading-tight">
            Sign in to continue building the owner, buyer, and admin flows.
          </h1>
          <p className="mt-4 text-base leading-7 text-[rgba(255,255,255,0.84)]">
            This prototype uses a signed session cookie so protected pages can work now while we keep the stack free and avoid adding an external auth service too early.
          </p>
          <div className="mt-8 space-y-4 text-sm leading-6 text-[rgba(255,255,255,0.88)]">
            <div className="rounded-[24px] border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.08)] p-4">
              Owners and managers can create listing drafts and upload proof documents.
            </div>
            <div className="rounded-[24px] border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.08)] p-4">
              Admin and manager roles unlock the review workspace and operations summary.
            </div>
          </div>
        </div>

        <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Session setup</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl">Choose a role and enter your contact details.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            After sign-in, we will route you to the right workspace and prefill contact information inside listing creation where it helps.
          </p>

          <div className="mt-6">
            <SignInForm nextPath={nextPath} />
          </div>
        </section>
      </section>
    </main>
  );
}
