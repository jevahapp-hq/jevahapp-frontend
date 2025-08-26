import { router } from "expo-router";

import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useState } from "react";
import {
    Alert,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import AuthHeader from "../components/AuthHeader";
import authService from "../services/authService";

export default function LoginScreen() {
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Debug password visibility
  console.log('Password visibility state:', showPassword);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLoginValidation = async () => {
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

    try {
      // Normalize inputs to avoid subtle auth failures due to whitespace/case
      const normalizedEmail = emailAddress.trim().toLowerCase();
      const normalizedPassword = password.trim();

      console.log("🔍 LOGIN DEBUG:", {
        emailLength: normalizedEmail.length,
      });

      const result = await authService.login(normalizedEmail, normalizedPassword);

      if (!result.success) {
        const message = result.data?.message || "Invalid email or password";
        Alert.alert("Login Failed", message);
        return;
      }

      // ✅ Token and user info are already saved by authService
      if (result.data?.user) {
        // 🛡️ Validate user data before proceeding
        if (result.data.user.firstName && result.data.user.lastName) {
          console.log("✅ Complete user data saved:", {
            firstName: result.data.user.firstName,
            lastName: result.data.user.lastName,
            hasAvatar: !!result.data.user.avatar
          });
        } else {
          console.error("🚨 BLOCKED: Login API returned incomplete user data!");
          console.error("   Incomplete data:", result.data.user);
          console.error("   This would have caused 'Anonymous User' to appear on uploads.");
          Alert.alert("Login Issue", "Incomplete user profile. Please contact support.");
          return;
        }
      }

      // Navigate to profile setup
      router.replace("/categories/HomeScreen");
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Login Error", "An unexpected error occurred.");
    }
  };

  const validatePassword = (password: string) => {
    return (
      password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password)
    );
  };

  return (
    <View className="flex-1 bg-white">
       <View className="px-4 mt-6">
        <AuthHeader title="Sign In" />
      </View>
      <View className="flex flex-col justify-center items-center mx-auto px-4 mt-0 w-[333px] bg-[#FCFCFD]">
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
                onChangeText={setEmailAddress}
                autoCapitalize="none"
                keyboardType="email-address"
                className="ml-3 w-full"
                 placeholderTextColor="#090E24"
              />
            </View>
            {emailError && (
              <Text className="text-red-500 text-sm mt-1">{emailError}</Text>
            )}
          </View>

          {/* Password Field */}
          <View className="flex flex-col w-[333px] mt-3">
            <View className="flex flex-row rounded-[15px] h-[56px] border border-[#9D9FA7] items-center px-3">
              <FontAwesome6 name="unlock-keyhole" size={15} color="black" />
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                className="ml-4 flex-1 text-[#090E24]"
                placeholderTextColor="#090E24"
                style={{ 
                  color: '#090E24',
                  fontSize: 16,
                  fontWeight: '400'
                }}
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

          <TouchableOpacity
            onPress={() => router.push("/auth/forgetPassword")}
            className="mt-2 flex flex-row w-[333px] ml-2"
          >
            <Text className="text-[#6663FD] text-[14px] font-rubik-semibold underline">
              Forgot password?
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex flex-col mt-32 justify-center items-center w-full">
          <TouchableOpacity
            onPress={handleLoginValidation}
            className="bg-[#090E24] p-2 rounded-full mt-0 w-[333px] h-[45px]"
          >
            <Text className="text-white text-center text-base">Sign In</Text>
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
