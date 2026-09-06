import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { hasBackendSession } from "../utils/sessionAuth";

export default function AuthLayout() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    hasBackendSession().then(setHasSession);
  }, []);

  if (hasSession === null) return null;

  if (hasSession) {
    return <Redirect href="/categories/HomeScreen" />;
  }

  return <Stack />;
}
