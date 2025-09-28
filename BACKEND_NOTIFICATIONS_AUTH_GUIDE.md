# Backend Notifications Auth Alignment Guide

Purpose: make REST and Socket.IO auth interop with the current React Native frontend.

## TL;DR (what to enable server-side)

- REST: accept `Authorization: Bearer <JWT>` on these routes and return `200 { success: true, data: ... }` or `401 { success: false, message: "Unauthorized" }`.

  - `GET /api/notifications`
  - `PATCH /api/notifications/:id/read`
  - `PATCH /api/notifications/mark-all-read`
  - `GET /api/notifications/preferences`
  - `PUT /api/notifications/preferences`
  - `GET /api/notifications/stats`

- Socket.IO: accept token from ANY of the following (frontend can reduce to one once you confirm):

  - `socket.handshake.auth.token`
  - `socket.handshake.headers.authorization` as `Bearer <JWT>`
  - `socket.handshake.query.token`

- If you support refresh, expose: `POST /api/auth/refresh` with body `{ token: "<oldJWT>" }` → `200 { data: { token: "<newJWT>" } }`.
  - If you do NOT support refresh, confirm tokens are long-lived; frontend will treat 401 as re-login.

## Suggested Socket.IO auth middleware

```ts
io.use((socket, next) => {
  const header = socket.handshake.headers?.authorization;
  const tokenFromHeader = header?.startsWith("Bearer ")
    ? header.slice(7)
    : null;
  const token =
    socket.handshake.auth?.token ||
    tokenFromHeader ||
    (typeof socket.handshake.query?.token === "string"
      ? socket.handshake.query.token
      : null);

  if (!token) return next(new Error("Unauthorized"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    (socket as any).user = payload;
    return next();
  } catch (e) {
    return next(new Error("Authentication failed"));
  }
});
```

## CORS / headers

- Allow `Authorization` and `Content-Type` headers.
- Default Socket.IO path `/socket.io` is fine.

## Example REST guard (Express)

```ts
function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ success: false, message: "Unauthorized" });
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    (req as any).user = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}
```

## Response shapes (please keep consistent)

- Success: `200 { success: true, data: ... }`
- Unauthorized: `401 { success: false, message: 'Unauthorized' }`

## Optional: Refresh endpoint contract

```http
POST /api/auth/refresh
Content-Type: application/json

{ "token": "<oldJWT>" }

200 { "success": true, "data": { "token": "<newJWT>" } }
```

If you choose not to implement refresh, we will prompt users to re-login on 401.
