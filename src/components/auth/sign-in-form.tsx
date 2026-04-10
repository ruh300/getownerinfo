"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { canAccessAdmin, canCreateListings, type AuthUser } from "@/lib/auth/types";
import { type UserRole } from "@/lib/domain";

const roleOptions: Array<{
  role: UserRole;
  label: string;
  description: string;
}> = [
  { role: "owner", label: "Owner", description: "Create listings and manage direct owner information." },
  { role: "buyer", label: "Buyer", description: "Browse listings and unlock trusted contact details." },
  { role: "manager", label: "Manager", description: "Oversee listings and access the operations dashboard." },
  { role: "admin", label: "Admin", description: "Review proofs, govern listings, and manage platform rules." },
];

type SignInResponse = {
  status: "ok";
  session: {
    user: AuthUser;
  };
  redirectTo: string;
};

export function SignInForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("owner");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              role,
              fullName,
              phone,
              email,
              redirectTo: nextPath,
            }),
          });

          const payload = (await response.json()) as SignInResponse & { message?: string };

          if (!response.ok) {
            throw new Error(payload.message ?? "Sign-in failed.");
          }

          router.push(payload.redirectTo);
          router.refresh();
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Sign-in failed.");
        }
      })();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        {roleOptions.map((option) => {
          const active = option.role === role;

          return (
            <button
              key={option.role}
              type="button"
              onClick={() => setRole(option.role)}
              className={`rounded-[24px] border p-4 text-left transition ${
                active
                  ? "border-[var(--primary)] bg-[rgba(0,237,100,0.08)] shadow-[0_12px_32px_rgba(0,30,43,0.08)]"
                  : "border-[var(--border)] bg-white"
              }`}
            >
              <p className="eyebrow text-[var(--primary)]">{option.label}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{option.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="eyebrow text-[var(--muted)]">Full name</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Your full name"
            autoComplete="name"
          />
        </label>
        <label className="space-y-2">
          <span className="eyebrow text-[var(--muted)]">Phone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Phone number"
            autoComplete="tel"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="eyebrow text-[var(--muted)]">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)]"
            placeholder="Email address"
            autoComplete="email"
          />
        </label>
      </div>

      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm leading-6 text-[var(--muted)]">
        <p className="font-semibold text-[var(--foreground)]">Workspace routing</p>
        <p className="mt-2">
          The selected role decides which product surface opens first after sign-in.
        </p>
        <p className="mt-2">
          {canAccessAdmin(role)
            ? "This role opens the admin operations workspace with review, investigations, fees, and audit visibility."
            : canCreateListings(role)
              ? "This role opens the owner workspace, listing wizard, commissions, penalties, and inquiry tracking."
              : "This role opens the buyer dashboard for unlock history, seeker requests, and pending payments."}
        </p>
        <p className="mt-2">
          Sign-in, unlock, and messaging writes are rate-limited to protect the marketplace while the production auth
          stack is finalized.
        </p>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(184,50,50,0.2)] bg-[rgba(184,50,50,0.08)] px-4 py-3 text-sm text-[#9c2d2d]">{error}</div> : null}

      <button
        type="submit"
        disabled={isPending}
        className={`w-full rounded-2xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${
          isPending ? "cursor-not-allowed bg-[rgba(0,104,74,0.45)]" : "bg-[var(--primary)] hover:bg-[var(--primary-light)] hover:text-[#00130d]"
        }`}
      >
        {isPending ? "Starting session..." : "Enter workspace"}
      </button>
    </form>
  );
}
