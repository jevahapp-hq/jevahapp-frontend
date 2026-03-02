import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import authService from "../services/authService";

export interface AuthUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  section?: string;
  emailVerified?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem("token");
      const u = await AsyncStorage.getItem("user");
      if (t) setToken(t);
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
      if (t) await AsyncStorage.setItem("token", t);
      if (u) await AsyncStorage.setItem("user", JSON.stringify(u));
      return res.data;
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

  const verifyEmail = useCallback(async (verificationToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.verifyEmail(verificationToken);
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
      await authService.logout();
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    token,
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
