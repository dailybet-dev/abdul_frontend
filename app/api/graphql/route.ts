import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
    const upstream = await fetch(`${backendUrl}/api/graphql`, {
      method: "POST",
      headers,
      body: await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const responseHeaders = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) responseHeaders.set("Set-Cookie", setCookie);
    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json({ errors: [{ message: "Unable to reach the GraphQL backend. Please try again." }] }, { status: 502 });
  }
}
