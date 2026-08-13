import AsyncStorage from "@react-native-async-storage/async-storage";
import { useClerk } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import authService from "../services/authService";
import {
  clearBackendSession,
  getSessionToken,
  hasBackendSessionSync,
  storeSessionToken,
} from "../utils/sessionAuth";

export interface AuthUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  section?: string;
  emailVerified?: boolean;
}

/**
 * App session hook — backend JWT is the source of truth (not Clerk).
 * `sessionLikely` is sync MMKV so Home can mount auth For You immediately.
 */
export function useAuth() {
  const { signOut: clerkSignOut } = useClerk();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionLikely, setSessionLikely] = useState(() =>
    hasBackendSessionSync()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = await getSessionToken();
      const u = await AsyncStorage.getItem("user");
      if (t) {
        setToken(t);
        setSessionLikely(true);
      } else {
        setSessionLikely(false);
      }
      if (u)
        try {
          setUser(JSON.parse(u));
        } catch {}
    })();
  }, []);

  const signUp = useCallback(async (payload: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.register(payload);
      if (!res.success) throw new Error(res?.data?.message || "Sign up failed");
      return res.data;
    } catch (e: any) {
      setError(e?.message || "Sign up failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.login(email, password);
      if (!res.success) throw new Error(res?.data?.message || "Sign in failed");
      const t = (res.data?.data?.token || res.data?.token) as string;
      const u = (res.data?.data?.user || res.data?.user) as AuthUser;
      setToken(t || null);
      setUser(u || null);
      setSessionLikely(!!t);
      if (t) await storeSessionToken(t);
      if (u) await AsyncStorage.setItem("user", JSON.stringify(u));
    } catch (e: any) {
      setError(e?.message || "Sign in failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.resendEmailVerification(email);
      if (!res.success) throw new Error(res?.data?.message || "Resend failed");
      return res.data;
    } catch (e: any) {
      setError(e?.message || "Resend failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.verifyEmailCode(email, code);
      if (!res.success) throw new Error(res?.data?.message || "Verify failed");
      return res.data;
    } catch (e: any) {
      setError(e?.message || "Verify failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.fetchMe();
      if (!res.success)
        throw new Error(res?.data?.message || "Fetch me failed");
      const u = (res.data?.data?.user || res.data?.user) as AuthUser;
      if (u) {
        setUser(u);
        await AsyncStorage.setItem("user", JSON.stringify(u));
      }
      return res.data;
    } catch (e: any) {
      setError(e?.message || "Fetch me failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await clearBackendSession();
      setUser(null);
      setToken(null);
      setSessionLikely(false);
      try {
        await clerkSignOut();
      } catch {
        // Email/password users may have no Clerk session
      }
    } finally {
      setLoading(false);
    }
  }, [clerkSignOut]);

  return {
    user,
    token,
    sessionLikely,
    isAuthenticated: Boolean(token || user || sessionLikely),
    loading,
    error,
    signUp,
    signIn,
    resendVerification,
    verifyEmail,
    fetchMe,
    signOut,
  };
}
