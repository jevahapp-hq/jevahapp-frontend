/**
 * The boot gate only trusts the backend JWT. A wiped local token sends the
 * user to the login form even when Google/Apple is still signed in.
 * Exchange that Clerk session for a backend JWT and skip the form.
 */
import {
  identityFromClerkUser,
  waitForClerkIdentity,
  type AccountIdentity,
} from "./accountIdentity";
import { authUtils, type UserInfo } from "./authUtils";
import { resetSessionExpiredGate } from "./sessionExpired";
import { getSessionToken, markBackendSessionPresent } from "./sessionAuth";

export async function restoreBackendSessionFromClerk(
  readUser: () => any,
  getToken: () => Promise<string | null>,
  options?: { forceExchange?: boolean }
): Promise<boolean> {
  resetSessionExpiredGate();

  if (!options?.forceExchange) {
    const existing = await getSessionToken();
    if (existing) {
      markBackendSessionPresent();
      return true;
    }
  }

  const identity = await waitForClerkIdentity(readUser, 8, 200);
  if (!identity) return false;

  const token = await getToken();
  if (!token) return false;

  const userInfo = userInfoFrom(identity, readUser());
  const result = await authUtils.sendAuthRequest(token, userInfo);
  await authUtils.storeAuthData(result, userInfo);
  resetSessionExpiredGate();
  return true;
}

function userInfoFrom(identity: AccountIdentity, user: any): UserInfo {
  return {
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: identity.email,
    avatar: String(user?.imageUrl || ""),
  };
}
