import { router } from "expo-router";

import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import AuthHeader from "../components/AuthHeader";
import { loginDebugger } from "../utils/loginDebugger";

export default function LoginScreen() {
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Debug password visibility
  // console.log("Password visibility state:", showPassword);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // On mount, restore last email and rememberMe choice, and optionally fast‑forward
  // straight to Home if we still have a token and the user opted into Remember Me.
  useEffect(() => {
    let cancelled = false;

    const hydrateFromStorage = async () => {
      try {
        const [storedEmail, storedRemember, storedToken] = await Promise.all([
          AsyncStorage.getItem("lastEmail"),
          AsyncStorage.getItem("rememberMe"),
          AsyncStorage.getItem("token"),
        ]);

        if (cancelled) return;

        if (storedEmail) {
          setEmailAddress(storedEmail);
        }

        const rememberFlag = storedRemember === "true";
        if (rememberFlag) {
          setRememberMe(true);

          // If we still have a token and the user chose Remember Me,
          // skip the form and take them back into the app.
          if (storedToken) {
            // console.log(
            //   "🔐 Remember Me active with stored token – redirecting to HomeScreen"
            // );
            router.replace("/categories/HomeScreen");
            return;
          }
        }
      } catch (err) {
        // console.warn("Failed to restore login prefs from storage:", err);
      }
    };

    hydrateFromStorage();

    return () => {
      cancelled = true;
    };
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLoginValidation = useCallback(async () => {
    let isValid = true;

    setEmailError("");
    setPasswordError("");

    if (!emailAddress.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!validateEmail(emailAddress.trim().toLowerCase())) {
      setEmailError("Invalid email format");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (!validatePassword(password)) {
      setPasswordError(
        "Password must be at least 6 characters with letters and numbers"
      );
      isValid = false;
    }

    if (!isValid) return;

    setIsLoading(true);
    try {
      // Debug the login attempt
      // console.log("🔍 Starting login debug...");
      await loginDebugger.validateEmail(emailAddress.trim().toLowerCase());
      await loginDebugger.validatePassword(password.trim());

      // Use authService for email/password login
      const result = await loginDebugger.debugLogin(
        emailAddress.trim().toLowerCase(),
        password.trim(),
        rememberMe
      );

      if (result.success && "data" in result && result.data?.token) {
        // console.log("✅ Login successful");

        // Persist last login details for future sessions (non-blocking - fire and forget)
        // Don't await - navigate immediately for instant UI response
        Promise.all([
          AsyncStorage.setItem("lastEmail", emailAddress.trim().toLowerCase()),
          AsyncStorage.setItem("rememberMe", rememberMe ? "true" : "false"),
          AsyncStorage.setItem("lastLoginAt", new Date().toISOString()),
        ]).catch(() => {
          // Non-critical, continue with navigation
        });

        // Navigate immediately without waiting for storage
        router.replace("/categories/HomeScreen");
      } else {
        // console.log("❌ Login failed:", result);
        const errorMessage =
          ("data" in result && result.data?.message) ||
          result.error ||
          "Invalid email or password";
        Alert.alert("Login Failed", errorMessage);
      }
    } catch (error) {
      // console.error("❌ Login error:", error);
      Alert.alert(
        "Login Failed",
        "An error occurred during login. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [emailAddress, password, rememberMe]);

  const validatePassword = (password: string) => {
    return (
      password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password)
    );
  };

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 mt-6">
        <AuthHeader
          title="Sign In"
          showBack={false} // Prevent navigating back into the app after logout
        />
      </View>
      <View className="flex flex-col justify-center items-center mx-auto px-4 mt-0 w-[333px] bg-white">
        <View className="flex flex-col justify-center items-start h-[160px] w-[333px] mt-3">
          <Text className="font-rubik-semibold text-[#1D2939] text-star text-[40px]">
            Great to see you {"\n"}again{" "}
            <Image
              source={{
                uri: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.gif",
              }}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          </Text>
          <Text className="mt-2 font-rubik text-[14px] w-full text-[#344054] text-start">
            Log in to pick up where you left off. Your sermons, playlists, and
            community await.
          </Text>
        </View>

        <View className="flex flex-col justify-center mt-6 items-center w-[333px] h-[157px]">
          {/* Email Field */}
          <View className="flex flex-col w-[333px] mt-2">
            <View className="flex flex-row rounded-[15px] h-[56px] border border-[#9D9FA7] items-center px-3">
              <Image
                source={require("../../assets/images/mail.png")}
                className="w-[20px] h-[18px]"
              />
              <TextInput
                placeholder="Email"
                value={emailAddress}
                onChangeText={(t) => {
                  setEmailAddress(t);
                  if (emailError) setEmailError("");
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                className="ml-3 w-full"
                placeholderTextColor="#090E24"
                returnKeyType="next"
                onSubmitEditing={() => {}}
              />
            </View>
            {emailError && (
              <Text className="text-red-500 text-sm mt-1">{emailError}</Text>
            )}
          </View>

          {/* Password Field */}
          <View className="flex flex-col w-[333px] mt-3">
            <View className="flex flex-row rounded-[15px] h-[56px] border border-[#9D9FA7] items-center px-3">
              <Image
                source={require("../../assets/images/lock.png")}
                className="w-[20px] h-[18px]"
              />
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (passwordError) setPasswordError("");
                }}
                secureTextEntry={!showPassword}
                className="ml-4 flex-1 text-[#090E24]"
                placeholderTextColor="#090E24"
                style={{
                  color: "#090E24",
                  fontSize: 16,
                  fontWeight: "400",
                }}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => {}}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome6
                  name={showPassword ? "eye-slash" : "eye"}
                  size={18}
                  color="#666666"
                />
              </TouchableOpacity>
            </View>
            {passwordError && (
              <Text className="text-red-500 text-sm mt-1">{passwordError}</Text>
            )}
          </View>

          <View className="mt-2 flex flex-row w-[333px] items-center justify-between">
            <TouchableOpacity
              onPress={() => setRememberMe((prev) => !prev)}
              className="flex flex-row items-center"
            >
              <View
                className={`w-4 h-4 rounded-[4px] border ${
                  rememberMe ? "bg-[#090E24] border-[#090E24]" : "border-[#9D9FA7]"
                } flex items-center justify-center`}
              >
                {rememberMe && (
                  <FontAwesome6 name="check" size={10} color="#FFFFFF" />
                )}
              </View>
              <Text className="ml-2 text-[#344054] text-[14px] font-rubik">
                Remember me
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/auth/forgetPassword")}
              className="flex flex-row ml-2"
            >
              <Text
                className="text-[#FEA74E] text-[14px] font-rubik-semibold"
                style={{ textDecorationLine: "none" }}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex flex-col mt-32 justify-center items-center w-full">
          <TouchableOpacity
            onPress={handleLoginValidation}
            disabled={isLoading}
            className="bg-[#090E24] p-2 rounded-full mt-0 w-[333px] h-[45px] flex-row items-center justify-center"
            style={{ opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? (
              <>
                <Text className="text-white text-center text-base">
                  Signing in…
                </Text>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            ) : (
              <Text className="text-white text-center text-base">
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          <Text className="text-1xl font-semibold mt-6">
            DON'T HAVE AN ACCOUNT?
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/auth/signup")}
            className="mt-6"
          >
            <Text className="text-[#344054] text-sm font-medium mt-4">
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
