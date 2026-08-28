import { Redirect } from "expo-router";

/** Stub route. Signup email-sent UI is EmailSeenSheet / VerifyEmailSheet. */
export default function EmailSeenRedirect() {
  return <Redirect href="/auth/codeVerification" />;
}
