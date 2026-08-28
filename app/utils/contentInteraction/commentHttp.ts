import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { CommentApiError, messageForCommentErrorCode } from "./errors";

/** A route that is simply not mounted on this deployment — try the next one. */
export function isMissingRoute(status: number): boolean {
  return status === 404 || status === 405;
}

export async function buildHeaders(opts?: {
  bypassHttpCache?: boolean;
}): Promise<HeadersInit> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "expo-platform": Platform.OS,
  };
  // OkHttp/RN: server 304 with no local cache → empty body / bogus failure.
  // Force a fresh 200 body for list reads (curl with no-cache returns comments).
  if (opts?.bypassHttpCache) {
    headers["Cache-Control"] = "no-cache";
    headers["Pragma"] = "no-cache";
  }
  try {
    const token =
      (await AsyncStorage.getItem("userToken")) ||
      (await AsyncStorage.getItem("token"));
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {
    // public GET — fine without token
  }
  return headers;
}

/**
 * Candidate URLs — primary contract first, then legacy/local variants.
 * First 200 wins.
 */
export function commentListUrls(
  baseURL: string,
  backendContentType: string,
  contentId: string,
  query: string
): string[] {
  return [
    `${baseURL}/api/content/${backendContentType}/${contentId}/comments?${query}`,
    `${baseURL}/api/media/${contentId}/comments?${query}`,
    `${baseURL}/api/content/${contentId}/comments?${query}`,
    `${baseURL}/api/interactions/${backendContentType}/${contentId}/comments?${query}`,
  ];
}

/** Drop Content-Type so fetch sets the multipart boundary itself. */
export function multipartHeaders(headers: HeadersInit): Record<string, string> {
  const copy: Record<string, string> = { ...(headers as Record<string, string>) };
  delete copy["Content-Type"];
  delete copy["content-type"];
  return copy;
}

export async function readCommentError(response: Response): Promise<never> {
  let body: any = {};
  try {
    body = await response.json();
  } catch {
    // ignore
  }
  const codeRaw = body?.code ?? body?.error?.code ?? body?.error;
  const code = typeof codeRaw === "string" ? codeRaw : undefined;
  const serverMsg =
    typeof body?.message === "string"
      ? body.message
      : typeof body?.error === "string"
        ? body.error
        : undefined;
  throw new CommentApiError(
    messageForCommentErrorCode(code, response.status, serverMsg),
    response.status,
    code
  );
}
