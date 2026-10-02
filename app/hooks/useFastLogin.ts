import { useAuth, useClerk, useOAuth, useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { waitForClerkIdentity } from "../utils/accountIdentity";
import { authUtils } from "../utils/authUtils";

export const useFastLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isSignedIn, isLoaded: authLoaded, signOut, getToken } = useAuth();
  const clerk = useClerk();
  const { isLoaded: userLoaded, user } = useUser();
  const userRef = useRef(user);
  userRef.current = user;
  const { startOAuthFlow: startGoogleAuth } = useOAuth({
    strategy: "oauth_google",
  });
  // Facebook OAuth temporarily disabled due to Clerk configuration issue
  // const { startOAuthFlow: startFacebookAuth } = useOAuth({
  //   strategy: 'oauth_facebook'
  // });
  const { startOAuthFlow: startAppleAuth } = useOAuth({
    strategy: "oauth_apple",
  });

  const login = useCallback(
    async (provider: "google" | "facebook" | "apple") => {
      if (!authLoaded || !userLoaded) {
        setError("Authentication system is loading. Please wait.");
        return;
      }

      // Immediate feedback
      setIsLoading(true);
      setError(null);

      try {
        // Get the appropriate auth function
        let authFn: () => Promise<any>;
        switch (provider) {
          case "google":
            authFn = startGoogleAuth;
            break;
          case "facebook":
            setError(
              "Facebook authentication is temporarily unavailable. Please use Google or Apple sign-in."
            );
            setIsLoading(false);
            return;
          case "apple":
            authFn = startAppleAuth;
            break;
          default:
            setError("Invalid authentication provider. Please try again.");
            setIsLoading(false);
            return;
        }

        // Fast authentication flow with immediate feedback
        // Test backend connectivity first
        const backendAvailable = await authUtils.testBackendConnection();
        if (!backendAvailable) {
          throw new Error(
            "Backend server is not accessible. Please check your connection."
          );
        }

        // Sign out if already signed in
        if (isSignedIn) {
          await signOut();
          let retries = 0;
          const maxRetries = 5; // Reduced retries for faster response
          while (retries < maxRetries && isSignedIn) {
            await new Promise((resolve) => setTimeout(resolve, 200)); // Reduced wait time
            retries++;
          }
        }

        // Start OAuth flow with error handling
        let authResult;
        try {
          authResult = await authFn();
        } catch (oauthError: any) {
          // Handle specific Facebook OAuth telemetry error
          if (
            oauthError?.message?.includes("telemetry") ||
            oauthError?.message?.includes("Value is a number")
          ) {
            console.warn(
              "⚠️ Clerk telemetry error (non-critical):",
              oauthError.message
            );
            // Continue with authentication flow
            authResult = await authFn();
          } else {
            throw oauthError;
          }
        }

        const { createdSessionId, setActive } = authResult;
        if (!createdSessionId || !setActive) {
          throw new Error(
            "OAuth flow failed: No session ID or setActive function"
          );
        }

        await setActive({ session: createdSessionId });

        // Read the Clerk user after the session is active. The `user` value
        // captured before OAuth is stale and used to be filled with
        // "Unknown" / "User", which the backend stored as an anonymous account.
        const identity = await waitForClerkIdentity(
          () => userRef.current || clerk.user
        );
        if (!identity) {
          try {
            await signOut();
          } catch {
            // No backend user was created. Clearing Clerk avoids a half-session.
          }
          throw new Error(
            "Google or Apple did not share a first name, last name, and email. No account was created. Sign up with email, or use an account that shares your name and email."
          );
        }

        const token = await getToken();
        if (!token) throw new Error("Failed to retrieve Clerk token");

        const liveUser = userRef.current || clerk.user;
        const userInfo = {
          firstName: identity.firstName,
          lastName: identity.lastName,
          avatar: liveUser?.imageUrl || "",
          email: identity.email,
        };

        // Send auth request to backend
        const backendAuthResult = await authUtils.sendAuthRequest(
          token,
          userInfo
        );
        await authUtils.storeAuthData(backendAuthResult, userInfo);

        const createdAt = backendAuthResult?.user?.createdAt;
        const { isNewAccount, markLoginTourPending, hasSeenLoginTour } =
          await import("../components/loginTour/loginTourStorage");
        const uid = String(
          backendAuthResult?.user?._id || backendAuthResult?.user?.id || ""
        );
        const fresh =
          isNewAccount(createdAt) ||
          backendAuthResult?.user?.isProfileComplete === false ||
          backendAuthResult?.isNewUser === true;
        if (!hasSeenLoginTour(uid) && fresh) {
          markLoginTourPending(uid || undefined);
        }

        // Navigate immediately on success
        router.replace("/categories/HomeScreen");
      } catch (error: any) {
        console.error("❌ Authentication error:", error);
        const errorMessage =
          error?.message || "Authentication failed. Please try again.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      authLoaded,
      userLoaded,
      isSignedIn,
      signOut,
      getToken,
      clerk,
      startGoogleAuth,
      startAppleAuth,
    ]
  );

  return {
    isLoading,
    error,
    login,
    clearError: () => setError(null),
  };
};
