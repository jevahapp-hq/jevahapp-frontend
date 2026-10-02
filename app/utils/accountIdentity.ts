/**
 * Identity required before any User record is created.
 * Email signup and Google/Apple exchange both go through this gate.
 * Placeholder names must never be sent to POST /register or POST /clerk-login.
 */

export type AccountIdentity = {
  firstName: string;
  lastName: string;
  email: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_PART =
  /^(anonymous|unknown|user|no speaker|no name|n\/a|na|null|undefined)$/i;
const PLACEHOLDER_FULL =
  /^(anonymous(\s+user)?|unknown(\s+user)?|no speaker|no name)$/i;

export function isPlaceholderName(value?: string | null): boolean {
  const text = String(value || "").trim();
  if (!text) return true;
  if (PLACEHOLDER_PART.test(text)) return true;
  if (PLACEHOLDER_FULL.test(text)) return true;
  return false;
}

export function isUsableEmail(value?: string | null): boolean {
  return EMAIL_RE.test(String(value || "").trim().toLowerCase());
}

export class IncompleteAccountIdentityError extends Error {
  constructor() {
    super(
      "A first name, last name, and email are required before an account can be created."
    );
    this.name = "IncompleteAccountIdentityError";
  }
}

/** Returns trimmed identity, or throws before any register / clerk-login request. */
export function assertAccountIdentity(input: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): AccountIdentity {
  const firstName = String(input?.firstName || "").trim();
  const lastName = String(input?.lastName || "").trim();
  const email = String(input?.email || "").trim().toLowerCase();

  if (
    isPlaceholderName(firstName) ||
    isPlaceholderName(lastName) ||
    PLACEHOLDER_FULL.test(`${firstName} ${lastName}`.trim()) ||
    !isUsableEmail(email)
  ) {
    throw new IncompleteAccountIdentityError();
  }

  return { firstName, lastName, email };
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function emailFromClerkUser(user: any): string {
  const addresses = Array.isArray(user?.emailAddresses)
    ? user.emailAddresses
    : [];
  const external = Array.isArray(user?.externalAccounts)
    ? user.externalAccounts
    : [];
  const candidates = [
    user?.primaryEmailAddress?.emailAddress,
    ...addresses.map((entry: any) => entry?.emailAddress),
    ...external.map((entry: any) => entry?.emailAddress),
  ];
  for (const candidate of candidates) {
    const email = String(candidate || "").trim().toLowerCase();
    if (isUsableEmail(email)) return email;
  }
  return "";
}

function namesFromClerkUser(user: any): { firstName: string; lastName: string } {
  const external = Array.isArray(user?.externalAccounts)
    ? user.externalAccounts
    : [];
  let firstName = firstString(user?.firstName, user?.givenName);
  let lastName = firstString(user?.lastName, user?.familyName);

  for (const account of external) {
    if (isPlaceholderName(firstName)) {
      firstName = firstString(
        account?.firstName,
        account?.givenName,
        firstName
      );
    }
    if (isPlaceholderName(lastName)) {
      lastName = firstString(
        account?.lastName,
        account?.familyName,
        lastName
      );
    }
  }

  const full = firstString(user?.fullName, user?.name);
  if (
    (isPlaceholderName(firstName) || isPlaceholderName(lastName)) &&
    full &&
    !isPlaceholderName(full) &&
    !PLACEHOLDER_FULL.test(full)
  ) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (isPlaceholderName(firstName) && parts[0]) firstName = parts[0];
    if (isPlaceholderName(lastName) && parts.length > 1) {
      lastName = parts.slice(1).join(" ");
    }
  }

  return { firstName, lastName };
}

/**
 * Read a Clerk user into account identity.
 * Returns null when Google/Apple did not share a real name and email.
 * Callers must not exchange the Clerk token in that case.
 */
export function identityFromClerkUser(user: any): AccountIdentity | null {
  if (!user) return null;
  try {
    return assertAccountIdentity({
      ...namesFromClerkUser(user),
      email: emailFromClerkUser(user),
    });
  } catch {
    return null;
  }
}

/** Poll a live Clerk user. The hook snapshot from before setActive is stale. */
export async function waitForClerkIdentity(
  readUser: () => any,
  attempts = 12,
  delayMs = 250
): Promise<AccountIdentity | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const current = readUser();
    const identity = identityFromClerkUser(current);
    if (identity) return identity;
    if (current && typeof current.reload === "function") {
      try {
        await current.reload();
      } catch {
        // Clerk may still be hydrating the session.
      }
      const reloaded = identityFromClerkUser(readUser());
      if (reloaded) return reloaded;
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}
