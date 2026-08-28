import { Redirect } from "expo-router";

/** Stub route. Live forgot-password flow starts at forgetPassword. */
export default function ResetPasswordRedirect() {
  return <Redirect href="/auth/forgetPassword" />;
}
