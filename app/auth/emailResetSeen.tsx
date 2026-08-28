import { Redirect } from "expo-router";

/** Stub route. Live reset confirmation is EmailResetSeenModal on forgetPassword. */
export default function EmailResetSeenRedirect() {
  return <Redirect href="/auth/forgetPassword" />;
}
