import { NextRequest, NextResponse } from "next/server";

const LOGIN_PATH = "/admin/login";
const ADMIN_SESSION_QUERY = `query AdminSession { adminMe { id } }`;
const LOGOUT_MUTATION = `mutation AdminLogout { logout { success } }`;

async function executeGraphQL(
  backendUrl: string,
  query: string,
  cookie: string | null,
) {
  return fetch(`${backendUrl}/api/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // This is a server-to-server middleware request, not a browser request.
      // Do not forward an Origin header: the backend's browser-origin check
      // should not reject session validation because FRONTEND_URL differs.
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  const cookie = request.headers.get("cookie");

  if (pathname === LOGIN_PATH || pathname.startsWith("/admin/login/")) {
    if (request.nextUrl.searchParams.get("logout") === "1") {
      if (backendUrl && cookie) {
        try {
          await executeGraphQL(backendUrl, LOGOUT_MUTATION, cookie);
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
    const response = await executeGraphQL(backendUrl, ADMIN_SESSION_QUERY, cookie);
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.data?.adminMe?.id) return NextResponse.next();
  } catch {
    // Fail closed: an unavailable GraphQL service must not expose admin pages.
  }

  const login = request.nextUrl.clone();
  login.pathname = LOGIN_PATH;
  login.search = "";
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*"] };
