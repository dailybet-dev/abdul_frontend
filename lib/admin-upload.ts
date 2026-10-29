export type AdminUploadResult = {
  success: true;
  name: string;
  path: string;
  url: string;
  size: number;
  contentType: string;
};

export async function uploadAdminFile(file: File): Promise<AdminUploadResult> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body,
    credentials: "same-origin",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success || !result?.url) {
    throw new Error(result?.error || "Unable to upload this file.");
  }
  return result as AdminUploadResult;
}
