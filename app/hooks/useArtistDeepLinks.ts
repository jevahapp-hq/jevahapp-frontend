/**
 * Resolve jevah:// and jevahapp:// deep links into expo-router paths.
 */
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect } from "react";

function pathFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const path = (parsed.path || "").replace(/^\/+/, "");
    if (!path) return null;

    // artists/:slug
    const artistMatch = path.match(/^artists\/([^/?#]+)/i);
    if (artistMatch?.[1] && artistMatch[1].toLowerCase() !== "artistprofile") {
      return `/artists/${decodeURIComponent(artistMatch[1])}`;
    }

    // creators (+ optional subpaths)
    if (/^creators(\/|$)/i.test(path)) {
      return `/${path}`;
    }

    return `/${path}`;
  } catch {
    return null;
  }
}

export function useArtistDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    const navigate = (url: string | null) => {
      if (!url) return;
      const route = pathFromUrl(url);
      if (!route) return;
      router.push(route as any);
    };

    void Linking.getInitialURL().then(navigate);
    const sub = Linking.addEventListener("url", ({ url }) => navigate(url));
    return () => sub.remove();
  }, [router]);
}
