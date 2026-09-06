import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { isAdmin } from "../utils/mediaDeleteAPI";

/**
 * Route-level guard: admin screens require a stored admin role.
 * Backend must still enforce authorization independently.
 */
export default function AdminLayout() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    isAdmin()
      .then(setAllowed)
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return null;
  if (!allowed) return <Redirect href="/categories/HomeScreen" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
