/** Pull token/user out of either `{ token, user }` or `{ data: { token, user } }`. */
export function pickAuthSession(data: any): {
  token: string | null;
  user: any | null;
} {
  if (!data || typeof data !== "object") {
    return { token: null, user: null };
  }
  const nested =
    data.data && typeof data.data === "object" ? data.data : null;
  const tokenCandidate = data.token || nested?.token || null;
  const token =
    typeof tokenCandidate === "string" && tokenCandidate.trim()
      ? tokenCandidate.trim()
      : null;
  const user = data.user || nested?.user || null;
  return { token, user };
}
