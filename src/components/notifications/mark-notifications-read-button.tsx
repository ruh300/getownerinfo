"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

type MarkNotificationsReadButtonProps = {
  unreadCount: number;
};

export function MarkNotificationsReadButton({ unreadCount }: MarkNotificationsReadButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (unreadCount === 0) {
    return null;
  }

  async function handleClick() {
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not mark notifications as read.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not mark notifications as read.");
      setIsPending(false);
      return;
    }

    setIsPending(false);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <button
        type="button"
        onClick={() => {
          void handleClick();
        }}
        disabled={isPending}
        className={`rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${
          isPending
            ? "cursor-not-allowed border-[var(--border)] bg-[var(--surface-alt)] text-[var(--muted)]"
            : "border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--surface-alt)]"
        }`}
      >
        {isPending ? "Saving..." : "Mark all read"}
      </button>
      {error ? <p className="text-sm text-[#9c2d2d]">{error}</p> : null}
    </div>
  );
}
