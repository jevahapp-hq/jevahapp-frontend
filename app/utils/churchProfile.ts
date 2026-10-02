/**
 * Church is saved on the existing user during profile setup.
 * A typed name is valid when the search list does not include that church.
 */

export type ChurchEntitySource = "internal" | "mapbox" | "manual";

export type ChurchChoice = {
  name: string;
  id?: string;
  type?: "church" | "branch";
  source: ChurchEntitySource;
};

/** Churches farther than this are left out of the nearby search. */
export const NEARBY_CHURCH_RADIUS_METERS = 40_000;

export function distanceMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const earth = 6_371_000;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearbyChurchBounds(
  origin: { lat: number; lng: number },
  radiusMeters = NEARBY_CHURCH_RADIUS_METERS
): { minLng: number; minLat: number; maxLng: number; maxLat: number } {
  const latDelta = radiusMeters / 111_320;
  const lngScale = Math.max(Math.cos((origin.lat * Math.PI) / 180), 0.2);
  const lngDelta = radiusMeters / (111_320 * lngScale);
  return {
    minLng: origin.lng - lngDelta,
    minLat: origin.lat - latDelta,
    maxLng: origin.lng + lngDelta,
    maxLat: origin.lat + latDelta,
  };
}

type LocatedChurch = {
  location?: { lat?: number; lng?: number } | null;
  distanceMeters?: number | null;
  center?: [number, number] | null;
};

function pointOf(item: LocatedChurch): { lat: number; lng: number } | null {
  const lat = item.location?.lat;
  const lng = item.location?.lng;
  if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  if (item.center && item.center.length === 2) {
    return { lng: item.center[0], lat: item.center[1] };
  }
  return null;
}

/** Keep churches inside the user's area and put the closest first. */
export function churchesNearUser<T extends LocatedChurch>(
  items: T[],
  origin: { lat: number; lng: number } | null | undefined,
  radiusMeters = NEARBY_CHURCH_RADIUS_METERS
): Array<T & { distanceMeters: number }> {
  if (!origin || !Array.isArray(items)) return [];
  return items
    .map((item) => {
      const known =
        typeof item.distanceMeters === "number" && Number.isFinite(item.distanceMeters)
          ? item.distanceMeters
          : null;
      const point = pointOf(item);
      const meters =
        known ?? (point ? distanceMeters(origin, point) : null);
      return { item, meters };
    })
    .filter(
      (row): row is { item: T; meters: number } =>
        row.meters != null && row.meters <= radiusMeters
    )
    .sort((a, b) => a.meters - b.meters)
    .map((row) => ({ ...row.item, distanceMeters: row.meters }));
}

const CHURCH_WORD =
  /\b(church|chapel|cathedral|parish|ministry|ministries|assembly|tabernacle|mosque|temple)\b/i;

/** Map results that are cities or streets are not a church match. */
export function isChurchPlaceName(name: string): boolean {
  return CHURCH_WORD.test(String(name || ""));
}

export function manualChurchChoice(name: string): ChurchChoice {
  return {
    name: String(name || "").trim(),
    type: "church",
    source: "manual",
  };
}

export function churchProfileUpdate(choice: ChurchChoice | null | undefined): {
  location: string;
  entityType: "church" | "branch";
  entitySource: ChurchEntitySource;
  entityId?: string;
} | null {
  const location = String(choice?.name || "").trim();
  if (location.length < 2) return null;
  const entitySource = choice?.source || "manual";
  const body: {
    location: string;
    entityType: "church" | "branch";
    entitySource: ChurchEntitySource;
    entityId?: string;
  } = {
    location,
    entityType: choice?.type === "branch" ? "branch" : "church",
    entitySource,
  };
  const id = String(choice?.id || "").trim();
  if (entitySource !== "manual" && id) body.entityId = id;
  return body;
}
