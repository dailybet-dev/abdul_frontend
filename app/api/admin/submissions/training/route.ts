import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendUrl) return NextResponse.json({ error: "The admin API is not configured." }, { status: 503 });

  // Read the session from both the incoming request and Next's request cookie store.
  // Some hosting adapters expose the parsed cookie even when the raw header is absent.
  const cookie = request.headers.get("cookie") || "";
  const cookieStore = await cookies();
  const rawSessionToken = cookie.split(";").map(part => part.trim())
    .filter(part => part.startsWith("admin_session="))
    .map(part => { const value = part.slice("admin_session=".length); try { return decodeURIComponent(value); } catch { return value; } })
    .find(value => value.length > 0);
  const sessionToken = request.cookies.get("admin_session")?.value || cookieStore.get("admin_session")?.value || rawSessionToken;
  if (!sessionToken) return NextResponse.json({ error: "No administrator session reached the training enquiries endpoint. Sign in again." }, { status: 401 });

  const incoming = new URL(request.url);
  const target = new URL("/admin/submissions/training", backendUrl);
  for (const key of ["search", "status"]) { const value = incoming.searchParams.get(key); if (value) target.searchParams.set(key, value); }

  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers: { Accept: "application/json", ...((cookie || sessionToken) ? { Cookie: cookie || `admin_session=${encodeURIComponent(sessionToken)}` } : {}),
        ...(sessionToken ? { "x-admin-session": sessionToken, Authorization: `Bearer ${sessionToken}` } : {}) },
      cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    const body = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json({ error: typeof body?.message === "string" ? body.message : `Training enquiries request failed (HTTP ${upstream.status}).` }, { status: upstream.status });
    return NextResponse.json({ data: Array.isArray(body) ? body : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reach the training enquiries service." }, { status: 502 });
  }
}
