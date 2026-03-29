import Link from "next/link";

import { formatDateTime } from "@/lib/formatting/date";
import { humanizeEnum } from "@/lib/formatting/text";
import type { NotificationCenterData } from "@/lib/notifications/workflow";

import { MarkNotificationsReadButton } from "./mark-notifications-read-button";

type NotificationCenterProps = {
  center: NotificationCenterData;
  eyebrow: string;
  title: string;
  emptyMessage: string;
};

export function NotificationCenter({ center, eyebrow, title, emptyMessage }: NotificationCenterProps) {
  return (
    <section id="notifications" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">{eyebrow}</p>
          <h2 className="mt-2 font-[var(--font-display)] text-3xl">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {center.unreadCount} unread notification{center.unreadCount === 1 ? "" : "s"} in your current workspace.
          </p>
        </div>
        <MarkNotificationsReadButton unreadCount={center.unreadCount} />
      </div>

      {center.items.length === 0 ? (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {center.items.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-[24px] border bg-[var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.06)] ${
                notification.readAt ? "border-[var(--border)]" : "border-[rgba(26,77,46,0.26)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary-light)]">
                    {humanizeEnum(notification.kind)}
                  </p>
                  <h3 className="mt-2 font-semibold text-[var(--foreground)]">{notification.title}</h3>
                </div>
                <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {humanizeEnum(notification.severity)}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{notification.body}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {formatDateTime(notification.createdAt)}
                {notification.readAt ? ` / Read ${formatDateTime(notification.readAt)}` : " / Unread"}
              </p>
              {notification.link ? (
                <div className="mt-4">
                  <Link
                    href={notification.link}
                    className="rounded-full border border-[var(--primary)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
                  >
                    Open
                  </Link>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
