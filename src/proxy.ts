import { NextResponse, type NextRequest } from "next/server";

import { authCookieName } from "@/lib/auth/constants";

const protectedPrefixes = ["/dashboard", "/admin", "/listings/new", "/seeker-requests/new"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(authCookieName)?.value;

  if (sessionCookie) {
    return NextResponse.next();
  }

  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = "/sign-in";
  signInUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/listings/new/:path*", "/seeker-requests/new/:path*"],
};
