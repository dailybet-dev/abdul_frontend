import { NextRequest, NextResponse } from "next/server";

const LOGIN_PATH = "/admin/login";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  const cookie = request.headers.get("cookie");

  if (pathname === LOGIN_PATH || pathname.startsWith("/admin/login/")) {
    if (request.nextUrl.searchParams.get("logout") === "1") {
      if (backendUrl && cookie) {
        try {
          await fetch(`${backendUrl}/api/auth/logout`, {
            method: "POST",
            headers: { cookie, origin: request.nextUrl.origin },
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          // Still clear the browser cookie if the API is temporarily unavailable.
        }
      }
      const login = request.nextUrl.clone();
      login.search = "";
      const response = NextResponse.redirect(login);
      response.cookies.delete("admin_session");
      return response;
    }
    return NextResponse.next();
  }

  if (!backendUrl || !cookie) {
    const login = request.nextUrl.clone();
    login.pathname = LOGIN_PATH;
    login.search = "";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  try {
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) return NextResponse.next();
  } catch {
    // Fail closed: an unavailable auth API must not expose admin pages.
  }

  const login = request.nextUrl.clone();
  login.pathname = LOGIN_PATH;
  login.search = "";
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*"] };
