/**
 * Public share link for a post. WhatsApp only makes a link clickable when the
 * https URL is in the message text. The same URL is the Open Graph page.
 */

const PUBLIC_HOST = "jevahapp.com";
const APP_SCHEMES = new Set(["jevah", "jevahapp", "jevahlite"]);

export type ContentShareInput = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
};

export type ContentSharePayload = {
  title: string;
  message: string;
  url?: string;
};

export type ContentOpenGraph = {
  title: string;
  description: string;
  url: string;
  type: "website";
  siteName: "Jevah";
  image?: string;
};

export function contentPublicUrl(mediaId: string): string {
  const id = encodeURIComponent(String(mediaId || "").trim());
  return `https://${PUBLIC_HOST}/content/${id}`;
}

function httpUrl(value: unknown): string {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

export function buildContentShare(input: ContentShareInput): ContentSharePayload {
  const title = String(input.title || "").trim() || "Jevah";
  const description = String(input.description || "").trim();
  const id = String(input.id || "").trim();
  const url = id ? contentPublicUrl(id) : "";
  const lines = [title];
  if (description) lines.push("", description);
  if (url) lines.push("", url);
  const payload: ContentSharePayload = {
    title,
    message: lines.join("\n"),
  };
  if (url) payload.url = url;
  return payload;
}

export function buildContentShareFromItem(
  item: {
    _id?: string | null;
    id?: string | null;
    title?: string | null;
    description?: string | null;
    caption?: string | null;
    thumbnailUrl?: unknown;
    imageUrl?: unknown;
  } | null | undefined,
  fallbackId?: string | null
): ContentSharePayload {
  const image =
    httpUrl(item?.thumbnailUrl) ||
    httpUrl(typeof item?.imageUrl === "string" ? item.imageUrl : "");
  return buildContentShare({
    id: item?._id || item?.id || fallbackId,
    title: item?.title,
    description: item?.description || item?.caption,
    imageUrl: image,
  });
}

export function buildContentOpenGraph(input: ContentShareInput): ContentOpenGraph {
  const title = String(input.title || "").trim() || "Jevah";
  const description = String(input.description || "").trim() || "Watch on Jevah";
  const id = String(input.id || "").trim();
  const url = id ? contentPublicUrl(id) : `https://${PUBLIC_HOST}`;
  const image = httpUrl(input.imageUrl);
  return {
    title,
    description,
    url,
    type: "website",
    siteName: "Jevah",
    ...(image ? { image } : {}),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML document WhatsApp reads for the link preview. */
export function buildContentOpenGraphHtml(input: ContentShareInput): string {
  const meta = buildContentOpenGraph(input);
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const image = meta.image ? escapeHtml(meta.image) : "";
  const tags = [
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:site_name" content="${meta.siteName}" />`,
    image ? `<meta property="og:image" content="${image}" />` : "",
  ].filter(Boolean);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${title}</title>`,
    ...tags,
    "</head>",
    "<body>",
    `<h1>${title}</h1>`,
    `<p>${description}</p>`,
    `<p><a href="${url}">${url}</a></p>`,
    "</body>",
    "</html>",
  ].join("");
}

/**
 * Map a shared link to the in-app content route.
 * https://jevahapp.com/content/:id, jevah://content/:id, and jevahapp://content/:id.
 */
export function contentRouteFromUrl(url: string): string | null {
  const raw = String(url || "").trim();
  if (!raw) return null;

  let pathname = raw;
  let protocol = "";
  let hostname = "";

  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    try {
      const parsed = new URL(raw);
      protocol = parsed.protocol.replace(":", "").toLowerCase();
      hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      pathname = parsed.pathname || "";
      if (APP_SCHEMES.has(protocol) && hostname) {
        pathname = `/${hostname}${parsed.pathname || ""}`;
      }
    } catch {
      return null;
    }
  }

  if (protocol === "http" || protocol === "https") {
    if (hostname !== PUBLIC_HOST) return null;
  } else if (protocol && !APP_SCHEMES.has(protocol)) {
    return null;
  }

  const match = pathname.match(/(?:^|\/)content\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  let id = match[1];
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  id = id.trim();
  if (!id) return null;
  return `/content/${encodeURIComponent(id)}`;
}
