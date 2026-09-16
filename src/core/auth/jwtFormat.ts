export function isValidJwtFormat(token: string): boolean {
  if (!token || token.trim() === "") return false;
  return token.split(".").length === 3;
}
