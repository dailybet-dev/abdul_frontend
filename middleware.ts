import { NextRequest, NextResponse } from "next/server";

const LOGIN_PATH = "/admin/login";
const ADMIN_SESSION_QUERY = `query AdminSession { adminMe { id } }`;
const LOGOUT_MUTATION = `mutation AdminLogout { logout { success } }`;

async function executeGraphQL(
  backendUrl: string,
  query: string,
  cookie: string | null,
  sessionToken: string | undefined,
) {
  return fetch(`${backendUrl}/api/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // This is a server-to-server middleware request, not a browser request.
      // Do not forward an Origin header: the backend's browser-origin check
      // should not reject session validation because FRONTEND_URL differs.
      ...(cookie ? { cookie } : {}),
      ...(sessionToken ? { "x-admin-session": sessionToken, authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  // Use Next's parsed httpOnly cookie as the source of truth. Strip any
  // duplicate/stale copies from the raw header before forwarding the session.
  const sessionToken = request.cookies.get("admin_session")?.value;
  const rawCookie = request.headers.get("cookie") || "";
  const cookie = sessionToken
    ? [
        ...rawCookie.split(";").map((part) => part.trim())
          .filter((part) => part && !part.startsWith("admin_session=")),
        `admin_session=${encodeURIComponent(sessionToken)}`,
      ].join("; ")
    : rawCookie;

  if (pathname === LOGIN_PATH || pathname.startsWith("/admin/login/")) {
    if (request.nextUrl.searchParams.get("logout") === "1") {
      if (backendUrl && cookie) {
        try {
          await executeGraphQL(backendUrl, LOGOUT_MUTATION, cookie, sessionToken);
        } catch {
          // Still clear the browser cookie if the GraphQL service is unavailable.
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
    const response = await executeGraphQL(backendUrl, ADMIN_SESSION_QUERY, cookie, sessionToken);
    // An unavailable backend does not mean the administrator has signed out.
    // Preserve the session and return a retryable error instead of redirecting.
    if (response.status >= 500) {
      return NextResponse.json(
        { error: "Administrator session verification is temporarily unavailable. Please retry shortly." },
        { status: 503 },
      );
    }
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.data?.adminMe?.id) return NextResponse.next();
  } catch {
    // Fail closed without clearing the browser cookie or pretending that a
    // temporary network failure means the administrator signed out.
    return NextResponse.json(
      { error: "Unable to verify the administrator session right now. Please retry shortly." },
      { status: 503 },
    );
  }

  const login = request.nextUrl.clone();
  login.pathname = LOGIN_PATH;
  login.search = "";
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*"] };
