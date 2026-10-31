import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendUrl) {
    return NextResponse.json({ errors: [{ message: "The GraphQL backend is not configured." }] }, { status: 503 });
  }

  const headers = new Headers({
    "Content-Type": request.headers.get("content-type") || "application/json",
  });

  // Preserve all session-cookie candidates. The backend guard validates each
  // candidate against the database, including duplicate cookies from migrations.
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  // Forward the session explicitly as a fallback for proxy runtimes that
  // normalize or omit Cookie headers on server-to-server requests.
  // NextRequest.cookies normally provides the parsed value, but retain a
  // raw-header fallback so the explicit session header is still populated
  // when an intermediary/runtime does not expose parsed cookies.
  const rawSessionToken = (cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("admin_session="))
    .map((part) => {
      const value = part.slice("admin_session=".length);
      try { return decodeURIComponent(value); } catch { return value; }
    })
    .find((value) => value.length > 0);
  const sessionToken = request.cookies.get("admin_session")?.value || rawSessionToken;
  if (sessionToken) {
    headers.set("x-admin-session", sessionToken);
    headers.set("authorization", `Bearer ${sessionToken}`);
  }

  // Do not forward the browser Origin header. This route is the same-origin
  // frontend proxy; the backend's origin check is intended for browser calls,
  // not this trusted server-to-server hop. Middleware and upload verification
  // already follow this same rule.

  try {
    const requestBody = await request.text();
    const upstream = await fetch(`${backendUrl}/api/graphql`, {
      method: "POST",
      headers,
      body: requestBody,
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const responseHeaders = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    });
    const responseBody = await upstream.text();
    let parsedBody: any = null;
    try { parsedBody = JSON.parse(responseBody); } catch { /* preserve non-JSON upstream responses */ }

    // A successful login returns the session token in the GraphQL payload.
    // This same-origin proxy is the sole authority that writes the browser
    // cookie in that case. Do not also forward Express's Set-Cookie header:
    // two writers for the same cookie name can produce inconsistent browser
    // state across proxy/runtime implementations.
    const sessionToken = parsedBody?.data?.login?.sessionToken;
    const isProxyManagedLogin = typeof sessionToken === "string" && sessionToken.length >= 32;

    if (!isProxyManagedLogin) {
      const cookieHeaders = upstream.headers as Headers & { getSetCookie?: () => string[] };
      const setCookies = cookieHeaders.getSetCookie?.() || [];
      if (setCookies.length) {
        for (const value of setCookies) responseHeaders.append("Set-Cookie", value);
      } else {
        const setCookie = upstream.headers.get("set-cookie");
        if (setCookie) responseHeaders.append("Set-Cookie", setCookie);
      }
    }
    // For a successful login, mint exactly one host-only browser cookie here.
    // The backend's Set-Cookie was intentionally not forwarded above.
    // The token is stripped from the JSON before it is returned to client code.
    if (isProxyManagedLogin) {
      delete parsedBody.data.login.sessionToken;
      const response = new NextResponse(JSON.stringify(parsedBody), {
        status: upstream.status,
        headers: responseHeaders,
      });
      response.cookies.set("admin_session", sessionToken, {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 8 * 60 * 60,
      });
      return response;
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json({ errors: [{ message: "Unable to reach the GraphQL backend. Please try again." }] }, { status: 502 });
  }
}
