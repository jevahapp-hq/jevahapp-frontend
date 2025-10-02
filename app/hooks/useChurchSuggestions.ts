import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../utils/api";

export type SuggestSource = "internal" | "mapbox";

export interface NormalizedAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface NormalizedResult {
  id: string;
  type: "church" | "branch";
  name: string;
  parentChurch?: { id: string; name: string };
  address: NormalizedAddress;
  location?: { lat: number; lng: number };
  source: SuggestSource;
  confidence: number;
  distanceMeters?: number;
  verified?: boolean;
}

function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function useChurchSuggestions(
  q: string,
  options?: {
    near?: { lat: number; lng: number };
    countryCode?: string; // e.g., "NG"
    source?: "internal" | "mapbox" | "combined";
    limit?: number;
  }
) {
  const [items, setItems] = useState<NormalizedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dq = useDebounce((q || "").trim(), 250);
  const abortRef = useRef<AbortController | null>(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("q", dq);
    p.set("limit", String(options?.limit ?? 10));
    p.set("source", String(options?.source ?? "combined"));
    if (options?.countryCode) p.set("country", options.countryCode);
    if (options?.near) p.set("near", `${options.near.lat},${options.near.lng}`);
    return p;
  }, [
    dq,
    options?.limit,
    options?.source,
    options?.countryCode,
    options?.near?.lat,
    options?.near?.lng,
  ]);

  useEffect(() => {
    if (dq.length < 2) {
      setItems([]);
      setLoading(false);
      setError(null);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const url = `${API_BASE_URL}/api/places/suggest?${params.toString()}`;
    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(`HTTP ${r.status}: ${txt}`);
        }
        return r.json();
      })
      .then((d) => {
        const list = Array.isArray(d?.results)
          ? (d.results as NormalizedResult[])
          : [];
        setItems(list);
      })
      .catch((e) => {
        if ((e as any)?.name === "AbortError") return;
        setError(String(e?.message || e));
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [dq, params]);

  return { items, loading, error };
}

export default useChurchSuggestions;
