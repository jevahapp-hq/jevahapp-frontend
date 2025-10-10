# Church Directory Suggestions API

Author: Frontend Team
Consumers: Mobile/Web Frontend
Owners: Backend Team

Purpose: Provide accurate church/branch suggestions for typeahead inputs, blending a curated internal directory with optional Mapbox results. Prefer internal, verified data, and normalize all results into a single schema the frontend can consume.

---

## Goals

- Deliver high‑precision suggestions for churches and their branches during user input
- Prefer curated, verified internal data; optionally blend with Mapbox when needed
- Single normalized schema with confidence scoring and optional distance
- Keep data centrally managed (no frontend hardcoding)

## Non‑Goals

- Not a full places database for general POIs
- Not a write API for end users (admin/moderated writes only)

---

## High‑Level Design

1. Backend exposes a single suggestions endpoint: `/api/places/suggest`
2. Queries internal directory first (fuzzy + geo boosted). If fewer than `limit`, optionally fetch and blend Mapbox results.
3. Normalize, score, and rank. Return top `limit` results.
4. Expose read endpoints for fetching a church and its branches by id.
5. Provide protected admin endpoints and bulk seed format for data ops.

---

## Data Model (Suggested)

Church

- `id: string`
- `name: string`
- `aliases: string[]` (alternative spellings/nicknames)
- `denomination?: string`
- `website?: string`
- `verified: boolean`
- `popularityScore?: number` (0–1 manual boost)

Branch

- `id: string`
- `churchId: string`
- `name?: string` (campus/branch name)
- `addressLine1: string`
- `addressLine2?: string`
- `city: string`
- `state?: string`
- `postalCode?: string`
- `countryCode: string` (ISO‑3166)
- `location: { lat: number; lng: number }` (indexed, PostGIS/2dsphere)
- `phone?: string`
- `serviceTimes?: string[]`
- `aliases?: string[]`
- `externalPlaceIds?: { mapbox?: string }`
- `verified: boolean`
- `popularityScore?: number`

---

## Endpoints

### 1) GET `/api/places/suggest`

Query Params

- `q: string` (required, min length 2)
- `near: "lat,lng"` (optional, boosts proximity)
- `radius?: number` (meters; default 50000)
- `limit?: number` (default 10, max 20)
- `source?: "internal" | "mapbox" | "combined"` (default: `combined`)
- `country?: string` (ISO‑3166 filter)
- `churchId?: string` (restrict to branches of a specific church)

Response 200

```json
{
  "success": true,
  "source": "combined",
  "results": [
    {
      "id": "branch_123",
      "type": "branch",
      "name": "Hillsong Church London",
      "parentChurch": { "id": "church_1", "name": "Hillsong Church" },
      "address": {
        "line1": "Some Rd 1",
        "city": "London",
        "state": "",
        "postalCode": "SW1A",
        "countryCode": "GB"
      },
      "location": { "lat": 51.5079, "lng": -0.1281 },
      "source": "internal",
      "confidence": 0.92,
      "distanceMeters": 850,
      "verified": true
    }
  ]
}
```

Errors

- `400` invalid params
- `429` rate limited
- `500` server error

Notes

- Always return a normalized shape regardless of source
- Results should be strongly de‑duplicated (internal vs mapbox)

### 2) GET `/api/churches/:id`

Returns a church and (optionally paginated) branches for confirmation or detail screens.

Example 200

```json
{
  "success": true,
  "church": {
    "id": "church_1",
    "name": "Hillsong Church",
    "aliases": ["Hillsong"],
    "verified": true,
    "branches": [
      {
        "id": "branch_london",
        "name": "London",
        "addressLine1": "Some Rd 1",
        "city": "London",
        "countryCode": "GB",
        "location": { "lat": 51.5079, "lng": -0.1281 },
        "verified": true
      }
    ]
  }
}
```

### 3) Admin/Seed (Protected)

- `POST /api/churches` (create church)
- `POST /api/churches/:id/branches` (create branch)
- `POST /api/churches/bulk` (JSON/CSV upload)
- `PUT/PATCH` to update church/branch; `DELETE` to remove
- Optional: `POST /api/churches/reindex` (rebuild search indexes)

---

## Blending Strategy (Server‑Side)

If `source=combined`:

1. Query internal index first using:
   - name + alias prefix and fuzzy matching
   - normalized scoring with proximity boost when `near` is provided
2. If internal results < `limit`, query Mapbox Places API with:
   - `types=poi`, categories matching church/place_of_worship
   - `proximity=lng,lat`, `country` if provided, same `limit`
3. Normalize Mapbox features into the unified schema
4. Rank/merge with these guidelines:
   - Exact/alias match boost
   - `verified` and `popularityScore` boost
   - Proximity decay (e.g., exponential decay using `radius`)
   - Prefer internal over Mapbox on ties
5. Return top `limit` results

---

## Search Implementation Notes

### Postgres + PostGIS (recommended)

Indexes

- `CREATE EXTENSION IF NOT EXISTS postgis;`
- `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- GIN on `to_tsvector('simple', name || ' ' || array_to_string(aliases,' '))`
- `pg_trgm` on `name`, `aliases` for prefix/fuzzy
- `GiST` (or `SP-GiST`) on `geography(location)`

Scoring heuristic (example)

```
score = 0.55 * textScore
      + 0.25 * proximityScore
      + 0.15 * verifiedBoost
      + 0.05 * popularityScore
```

Where

- `textScore` combines exact/alias/prefix/fuzzy (use `similarity()` / `ILIKE`)
- `proximityScore` decays with distance (e.g., exp decay within `radius`)
- `verifiedBoost` is `1` for verified, else `0`
- `popularityScore` is normalized 0–1

### MongoDB Alternative

- 2dsphere index on `location`
- Text/Atlas Search index for `name`, `aliases`, `address`
- Use `$search` with `autocomplete` for prefix + `compound` with geo boosting

---

## Mapbox Integration (Optional)

Endpoint

- `https://api.mapbox.com/geocoding/v5/mapbox.places/{q}.json`

Params

- `proximity=lng,lat`
- `limit`
- `types=poi`
- `country=XX`
- `access_token=<MAPBOX_TOKEN>`

Filtering

- Only include features with categories matching `church`, `place_of_worship`, etc.
- Normalize to the unified schema and include `source: "mapbox"` and confidence mapping

---

## Caching & Rate Limiting

- Cache hot queries per region (60–300s). Cache key: `q|nearBucket|country|source`
- Rate limit by IP/user to protect Mapbox quota and service stability
- Support ETag/If‑None‑Match when feasible for idempotent responses

---

## Seed/Bulk Data Format

```json
{
  "churches": [
    {
      "id": "church_1",
      "name": "Hillsong Church",
      "aliases": ["Hillsong"],
      "denomination": "Pentecostal",
      "verified": true,
      "branches": [
        {
          "id": "branch_london",
          "name": "London",
          "addressLine1": "Some Rd 1",
          "city": "London",
          "countryCode": "GB",
          "location": { "lat": 51.5079, "lng": -0.1281 },
          "aliases": ["Hillsong London"],
          "verified": true
        }
      ]
    }
  ]
}
```

---

## Security

- `GET /api/places/suggest` may be public; apply basic rate limiting
- Admin endpoints require auth/role checks; validate payloads strictly

---

## Observability

- Log: query, source(s), latency, result count, and chosen blending path
- Metrics: counters for Mapbox calls, cache hit rate, no‑result rates
- Tracing: tag internal vs external operations for latency analysis

---

## Minimal Controller Pseudocode (Express/Nest style)

```ts
// validate q, limit, near
// internalResults = searchInternal(q, near, radius, limit)
// if source !== 'internal' and internalResults.length < limit:
//   mapboxResults = queryMapbox(q, near, limit - internalResults.length)
//   normalized = normalize(mapboxResults)
//   results = mergeAndScore(internalResults, normalized)
// else:
//   results = internalResults
// return top N with confidence
```

---

## Frontend Contract (Reference)

Call pattern (debounced 250ms):
`GET /api/places/suggest?q=TEXT&near=LAT,LNG&limit=10&source=combined`

Display rules:

- Show internal results first (badge: "Verified")
- If present, show additional Mapbox results under a divider
- Always include CTA: "Can’t find it? Add your church"
- If user selects a Mapbox item matching an internal branch (same name/address threshold), snap to the internal id

---

## Open Questions / Options

- Should we restrict Mapbox by `country` inferred from `near` by default?
- Admin UI for seed/bulk upload and moderation: in scope now or later?
- SLA for seed updates to appear in the index (e.g., async reindex within 1 min)
