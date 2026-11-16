export class ClientApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)gl_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]!) : "";
}

export async function apiFetch<T>(
  url: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken(),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string }
    | null;

  if (!res.ok || !data || !data.ok) {
    const message = data && "error" in data ? data.error : "Request failed. Please try again.";
    const code = data && "code" in data ? data.code : undefined;
    throw new ClientApiError(message, res.status, code);
  }
  return data.data;
}

export async function apiUpload<T>(
  url: string,
  formData: FormData,
  onProgress?: (pct: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("x-csrf-token", csrfToken());
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as
          | { ok: true; data: T }
          | { ok: false; error: string; code?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
          resolve(data.data);
        } else {
          reject(
            new ClientApiError(
              !data.ok ? data.error : "Upload failed.",
              xhr.status,
              !data.ok ? data.code : undefined,
            ),
          );
        }
      } catch {
        reject(new ClientApiError("Upload failed. Please try again.", xhr.status));
      }
    };
    xhr.onerror = () => reject(new ClientApiError("Network error during upload.", 0));
    xhr.send(formData);
  });
}

type PresignResponse = {
  upload: {
    key: string;
    url: string;
    headers: Record<string, string>;
  };
};

/**
 * Direct-to-R2 upload for large files (videos).
 * Bypasses the Cloudflare Worker 100 MB request-body limit by uploading
 * straight to the bucket with a short-lived signed URL.
 */
export async function apiUploadDirect<T>(
  file: File,
  kind: string,
  onProgress?: (pct: number) => void,
): Promise<T> {
  const presign = await apiFetch<PresignResponse>("/api/upload/presign", {
    method: "POST",
    body: { kind, contentType: file.type, size: file.size },
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presign.upload.url);
    for (const [header, value] of Object.entries(presign.upload.headers)) {
      xhr.setRequestHeader(header, value);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new ClientApiError("Storage upload failed.", xhr.status));
    };
    xhr.onerror = () => reject(new ClientApiError("Network error during upload.", 0));
    xhr.send(file);
  });

  return apiFetch<T>("/api/upload/complete", {
    method: "POST",
    body: { key: presign.upload.key, kind },
  });
}
