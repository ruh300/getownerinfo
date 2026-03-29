import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { getCurrentSession } from "@/lib/auth/session";
import { getUnreadNotificationCountForSession } from "@/lib/notifications/workflow";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "getownerinfo",
    template: "%s | getownerinfo",
  },
  description:
    "Verified owner-access marketplace for Rwanda with listing approvals, seeker demand, protected buyer workflows, and token unlock flows.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();
  let unreadNotificationCount = 0;

  if (session) {
    try {
      unreadNotificationCount = await getUnreadNotificationCountForSession(session);
    } catch {
      unreadNotificationCount = 0;
    }
  }

  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerif.variable} bg-[var(--background)] text-[var(--foreground)] antialiased`}>
        <div className="min-h-screen">
          <SiteHeader session={session} unreadNotificationCount={unreadNotificationCount} />
          {children}
        </div>
      </body>
    </html>
  );
}
