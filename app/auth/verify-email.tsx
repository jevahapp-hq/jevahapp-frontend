import { Redirect } from "expo-router";

/** Stub route. Live signup verify is codeVerification + VerifyEmailSheet. */
export default function VerifyEmailRedirect() {
  return <Redirect href="/auth/codeVerification" />;
}
