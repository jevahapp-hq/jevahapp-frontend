import { router } from "expo-router";

import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

  // Debug password visibility
  console.log("Password visibility state:", showPassword);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
      console.log("🔍 Starting login debug...");
      await loginDebugger.validateEmail(emailAddress.trim().toLowerCase());
      await loginDebugger.validatePassword(password.trim());

      // Use authService for email/password login
      const result = await loginDebugger.debugLogin(
        emailAddress.trim().toLowerCase(),
        password.trim()
      );

      if (result.success && "data" in result && result.data?.token) {
        console.log("✅ Login successful");

        // Clear any previous user's interaction data
        try {
          const { useInteractionStore } = await import(
            "../store/useInteractionStore"
          );
          useInteractionStore.getState().clearCache();
          console.log("✅ Cleared interaction cache on login");
        } catch (cacheError) {
          console.warn(
            "⚠️ Failed to clear interaction cache on login:",
            cacheError
          );
        }

        router.replace("/categories/HomeScreen");
      } else {
        console.log("❌ Login failed:", result);
        const errorMessage =
          ("data" in result && result.data?.message) ||
          result.error ||
          "Invalid email or password";
        Alert.alert("Login Failed", errorMessage);
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      Alert.alert(
        "Login Failed",
        "An error occurred during login. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [emailAddress, password]);

  const validatePassword = (password: string) => {
    return (
      password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password)
    );
  };

  // Keyboard event listeners for better UX
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      enabled={true}
    >
      <View className="flex-1 bg-white">
        <View className="px-4 mt-6">
          <AuthHeader title="Sign In" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: isKeyboardVisible ? 20 : 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex flex-col justify-center items-center mx-auto px-4 w-full max-w-[333px]">
            {/* Welcome Section */}
            <View className="flex flex-col justify-center items-start w-full mt-3 mb-6">
              <Text className="font-rubik-semibold text-[#1D2939] text-start text-[32px] leading-[40px]">
                Great to see you {"\n"}again{" "}
                <Image
                  source={{
                    uri: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.gif",
                  }}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              </Text>
              <Text className="mt-2 font-rubik text-[14px] w-full text-[#344054] text-start leading-[20px]">
                Log in to pick up where you left off. Your sermons, playlists,
                and community await.
              </Text>
            </View>

            {/* Form Section */}
            <View className="flex flex-col w-full mb-6">
              {/* Email Field */}
              <View className="flex flex-col w-full mb-4">
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
                    className="ml-3 flex-1 text-[#090E24]"
                    placeholderTextColor="#090E24"
                    returnKeyType="next"
                    onSubmitEditing={() => {}}
                    style={{
                      color: "#090E24",
                      fontSize: 16,
                      fontWeight: "400",
                    }}
                  />
                </View>
                {emailError && (
                  <Text className="text-red-500 text-sm mt-1 ml-1">
                    {emailError}
                  </Text>
                )}
              </View>

              {/* Password Field */}
              <View className="flex flex-col w-full mb-4">
                <View className="flex flex-row rounded-[15px] h-[56px] border border-[#9D9FA7] items-center px-3">
                  <FontAwesome6 name="unlock-keyhole" size={15} color="black" />
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
                    onSubmitEditing={handleLoginValidation}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <FontAwesome6
                      name={showPassword ? "eye-slash" : "eye"}
                      size={18}
                      color="#666666"
                    />
                  </TouchableOpacity>
                </View>
                {passwordError && (
                  <Text className="text-red-500 text-sm mt-1 ml-1">
                    {passwordError}
                  </Text>
                )}
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                onPress={() => router.push("/auth/forgetPassword")}
                className="mt-2 mb-6 self-start"
              >
                <Text className="text-[#6663FD] text-[14px] font-rubik-semibold underline">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Section - Always visible above keyboard */}
            <View className="flex flex-col justify-center items-center w-full mt-auto">
              <TouchableOpacity
                onPress={handleLoginValidation}
                disabled={isLoading}
                className="bg-[#090E24] p-4 rounded-full w-full h-[50px] justify-center items-center mb-6"
                style={{
                  minHeight: 50,
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                <Text className="text-white text-center text-base font-rubik-semibold">
                  {isLoading ? "Signing in…" : "Sign In"}
                </Text>
              </TouchableOpacity>

              <Text className="text-lg font-semibold text-center mb-4 text-[#1D2939]">
                DON'T HAVE AN ACCOUNT?
              </Text>

              <TouchableOpacity
                onPress={() => router.push("/auth/signup")}
                className="mb-4"
              >
                <Text className="text-[#344054] text-sm font-medium underline">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
