import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/editor", request.url));
  }

  if (!isAuthPage && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/editor", "/editor/:path*", "/login", "/signup"],
};
