"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/auth/session", {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Could not sign out right now.");
          }

          router.push("/sign-in");
          router.refresh();
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Could not sign out right now.");
        }
      })();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSignOut}
        className={className ?? "rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-alt)]"}
      >
        {isPending ? "Signing out..." : "Sign out"}
      </button>
      {error ? <p className="text-xs text-[#9c2d2d]">{error}</p> : null}
    </div>
  );
}
