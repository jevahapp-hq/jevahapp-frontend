import { Platform } from "react-native";

export type LocalUploadFile = {
  uri: string;
  name: string;
  mimeType?: string;
};

/**
 * Expo fetch throws "Unsupported FormDataPart implementation" for RN
 * `{ uri, name, type }` parts. Native XHR still streams those from disk;
 * web uses a Blob with the WHATWG FormData/fetch path.
 */
export async function appendLocalFile(
  formData: FormData,
  fieldName: string,
  file: LocalUploadFile
): Promise<void> {
  if (!file?.uri) {
    throw new Error(`Missing file for ${fieldName}`);
  }

  if (Platform.OS === "web") {
    const blobRes = await fetch(file.uri);
    const blob = await blobRes.blob();
    const typed =
      file.mimeType && blob.type !== file.mimeType
        ? new Blob([blob], { type: file.mimeType })
        : blob;
    formData.append(fieldName, typed, file.name);
    return;
  }

  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "application/octet-stream",
  } as any);
}

function parseXhrHeaders(raw: string): Headers {
  const headers = new Headers();
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) headers.append(key, value);
  }
  return headers;
}

export async function postMultipartForm(
  url: string,
  formData: FormData,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<Response> {
  if (Platform.OS === "web") {
    return fetch(url, {
      method: "POST",
      headers,
      body: formData,
      signal,
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [key, value] of Object.entries(headers)) {
      if (value) xhr.setRequestHeader(key, value);
    }

    const abort = () => xhr.abort();
    if (signal) {
      if (signal.aborted) {
        abort();
        reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        return;
      }
      signal.addEventListener("abort", abort, { once: true });
    }

    xhr.onload = () => {
      signal?.removeEventListener("abort", abort);
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseXhrHeaders(xhr.getAllResponseHeaders()),
        })
      );
    };
    xhr.onerror = () => {
      signal?.removeEventListener("abort", abort);
      reject(new TypeError("Network request failed"));
    };
    xhr.onabort = () => {
      signal?.removeEventListener("abort", abort);
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    };

    xhr.send(formData);
  });
}
