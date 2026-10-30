import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "application/pdf",
]);

function hasValidSignature(bytes: Buffer, contentType: string) {
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (contentType === "image/gif") return /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString("ascii"));
  if (contentType === "image/webp") return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (contentType === "image/avif") return bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp" && /avif|avis/.test(bytes.subarray(8, 16).toString("ascii"));
  if (contentType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

function safeFileName(name: string, contentType: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
    "image/gif": ".gif", "image/avif": ".avif", "application/pdf": ".pdf",
  };
  const ext = extensions[contentType] || "";
  const originalExt = name.toLowerCase().match(/\.[a-z0-9]{1,10}$/)?.[0] || "";
  const base = name.slice(0, name.length - originalExt.length)
    .normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 70) || "upload";
  return `${base}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
}

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const uploadPath = (process.env.GITHUB_UPLOAD_PATH || "public/uploads").replace(/^\/+|\/+$/g, "");

  if (!backendUrl) return NextResponse.json({ error: "The admin API is not configured." }, { status: 503 });
  if (!token || !owner || !repo) {
    return NextResponse.json({ error: "GitHub uploads are not configured. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO in Railway." }, { status: 503 });
  }

  // Forward the browser's original cookie header unchanged. The backend
  // admin guard checks each admin_session candidate, so a stale duplicate
  // cookie cannot mask the valid session used for the admin upload.
  const cookie = request.headers.get("cookie") || "";
  if (!cookie) {
    return NextResponse.json({ error: "Administrator login required. Please sign in again." }, { status: 401 });
  }

  try {
    const origin = request.headers.get("origin");
    const authResponse = await fetch(`${backendUrl}/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify({ query: "query VerifyAdminUpload { adminMe { id } }" }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const authResult = await authResponse.json().catch(() => null);
    if (!authResponse.ok || !authResult?.data?.adminMe?.id) {
      return NextResponse.json({ error: "Your administrator session is invalid or expired. Please sign in again." }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Supported formats: JPG, PNG, WebP, GIF, AVIF and PDF." }, { status: 415 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Files must be smaller than 8 MB." }, { status: 413 });

    const filename = safeFileName(file.name, file.type);
    const path = `${uploadPath}/${filename}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!hasValidSignature(bytes, file.type)) {
      return NextResponse.json({ error: "The selected file does not contain valid " + file.type + " data. Please choose a genuine file." }, { status: 415 });
    }
    const githubResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Upload admin asset: ${filename}`,
        content: bytes.toString("base64"),
        branch,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const githubResult = await githubResponse.json().catch(() => null);
    if (!githubResponse.ok) {
      const message = githubResult?.message || "GitHub rejected the upload.";
      return NextResponse.json({ error: message }, { status: githubResponse.status === 422 ? 409 : 502 });
    }

    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path.split("/").map(encodeURIComponent).join("/")}`;
    return NextResponse.json({ success: true, name: filename, path, url, size: file.size, contentType: file.type });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
