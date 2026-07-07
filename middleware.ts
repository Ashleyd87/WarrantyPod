import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

// Fast cookie-presence check for UX redirects. Real authorization happens
// server-side in every page/action via requireUser().
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!sessionCookie && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals, static files and the auth API.
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.png$).*)",
  ],
};
