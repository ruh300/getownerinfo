import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { getCurrentSession } from "@/lib/auth/session";

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
  title: "getownerinfo",
  description: "Free-first marketplace starter for verified owner access and token unlock flows.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerif.variable} bg-[var(--background)] text-[var(--foreground)] antialiased`}>
        <div className="min-h-screen">
          <SiteHeader session={session} />
          {children}
        </div>
      </body>
    </html>
  );
}
