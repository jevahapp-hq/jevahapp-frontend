import { useCallback, useState } from "react";

const API_BASE_URL = "https://jevahapp-backend.onrender.com";

export function useForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const requestPasswordReset = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.message || `Request failed: ${res.status}`);
      setMessage(
        json?.message || "If that email exists, a reset link has been sent."
      );
      return json;
    } catch (e: any) {
      setError(e?.message || "Request failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.message || `Reset failed: ${res.status}`);
      setMessage(
        json?.message || "Password has been reset successfully. Please sign in."
      );
      return json;
    } catch (e: any) {
      setError(e?.message || "Reset failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyResetToken = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE_URL}/api/auth/verify-reset-token?token=${encodeURIComponent(
        token
      )}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.message || `Token invalid: ${res.status}`);
      return json;
    } catch (e: any) {
      setError(e?.message || "Token invalid");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    message,
    requestPasswordReset,
    resetPassword,
    verifyResetToken,
  };
}
