# Frontend Notifications Integration

## Token handling

- Login stores token via `TokenUtils.storeAuthToken(token)`.
- All requests include `Authorization: Bearer <token>` and `Content-Type: application/json`.
- On 401, prompt re-login (no client refresh).

## REST endpoints

- Base URL: `${API_BASE_URL}`
- Notifications endpoints under `/api/notifications`.

## Socket.IO

- Connect to `${API_BASE_URL}` (origin) with `auth: { token }`.
- Backend may also accept `headers.authorization` or `query.token`.

## Debugging

- Log `TokenUtils.getTokenInfo()` before requests if needed.
- Ensure device can reach `API_BASE_URL` (avoid localhost on device).
