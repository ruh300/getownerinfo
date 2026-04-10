import type { Metadata } from "next";
import { Manrope, Newsreader, Source_Code_Pro } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { getCurrentSession } from "@/lib/auth/session";
import { getUnreadNotificationCountForSession } from "@/lib/notifications/workflow";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "getownerinfo",
    template: "%s | getownerinfo",
  },
  description:
    "Verified owner-access marketplace for Rwanda with protected token unlocks, seeker demand, owner workflows, and an operations-grade admin review system.",
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
    <html
      lang="en"
      className={`${manrope.variable} ${newsreader.variable} ${sourceCodePro.variable}`}
    >
      <body className="bg-[var(--background)] text-[var(--foreground)] antialiased">
        <div className="min-h-screen">
          <SiteHeader session={session} unreadNotificationCount={unreadNotificationCount} />
          {children}
        </div>
      </body>
    </html>
  );
}
