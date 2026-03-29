import Link from "next/link";

import { SeekerRequestForm } from "@/components/seeker-requests/seeker-request-form";
import { requireSession } from "@/lib/auth/session";

export default async function NewSeekerRequestPage() {
  await requireSession({ roles: ["buyer"] });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <section className="overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-10">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">Buyer request board</p>
            <h1 className="font-[var(--font-display)] text-4xl leading-tight md:text-5xl">
              Post what you need and let the right owner come to you.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[var(--muted)]">
              Use seeker requests when the right listing is missing or buried. The public board stays anonymized, while your contact details remain hidden until the future owner token flow is added.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/seeker-requests"
                className="rounded-full border border-[var(--primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
              >
                Browse seeker board
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition hover:bg-[rgba(200,134,10,0.08)]"
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[26px] border border-[rgba(26,77,46,0.12)] bg-[linear-gradient(180deg,rgba(26,77,46,0.98),rgba(20,92,56,1))] p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.72)]">How it works</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-[rgba(255,255,255,0.86)]">
              <div className="rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] p-4">
                Owners see your category, budget range, location, and need summary.
              </div>
              <div className="rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] p-4">
                Your name and phone remain hidden from the public board.
              </div>
              <div className="rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] p-4">
                The posting fee is recorded as a prototype payment so we can wire real AfrIPay later.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] md:p-8">
        <SeekerRequestForm />
      </section>
    </main>
  );
}
