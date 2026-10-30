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

  // Preserve the browser's complete Cookie header. Do not collapse duplicate
  // admin_session values here: the backend guard can validate each candidate
  // against the session table and select the valid one.
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const origin = request.headers.get("origin");
  if (origin) headers.set("origin", origin);

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
