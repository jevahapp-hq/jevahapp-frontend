import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthHeader from "../components/AuthHeader";
import authService from "../services/authService";

export default function ResetPassword() {
  const params = useLocalSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Debug password visibility
  console.log("Password visibility states:", {
    showPassword,
    showConfirmPassword,
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailAddress = params.emailAddress as string;

  return (
    <View className="flex-1 bg-white">
      <AuthHeader title="Reset Password" />
      <View className="flex flex-col justify-center mx-auto mt-12 w-[333px]">
        <View className="flex flex-col w-[333px] h-[176px]">
          <Text className="text-4xl font-bold mb-4 text-[#1D2939]">
            Reset Password
          </Text>
          <Text className="mt-2 text-[#1D2939]">Enter your new password.</Text>
        </View>

        <View className="flex flex-col">
          <View className="flex flex-row rounded-[15px] w-[333px] h-[56px] border border-[#9D9FA7] items-center justify-center mt-2">
            <Image
              source={require("../../assets/images/lock.png")}
              className="w-[20px] h-[18px]"
            />
            <TextInput
              placeholder="Password"
              className="border-hidden outline-none w-[250px] h-[40px] ml-2 text-[#090E24]"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#090E24"
              style={{
                color: "#090E24",
                fontSize: 16,
                fontWeight: "400",
              }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <FontAwesome5
                name={showPassword ? "eye" : "eye-slash"}
                size={15}
                color="black"
              />
            </TouchableOpacity>
          </View>

          <View className="flex flex-row rounded-[15px] w-[333px] h-[56px] border border-[#9D9FA7] items-center justify-center mt-4">
            <Image
              source={require("../../assets/images/lock.png")}
              className="w-[20px] h-[18px]"
            />
            <TextInput
              placeholder="Confirm Password"
              className="border-hidden outline-none w-[250px] h-[40px] ml-2 text-[#090E24]"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor="#090E24"
              style={{
                color: "#090E24",
                fontSize: 16,
                fontWeight: "400",
              }}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <FontAwesome5
                name={showConfirmPassword ? "eye" : "eye-slash"}
                size={15}
                color="black"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex flex-col mt-36 justify-center items-center h-[113px] w-[333px]">
          <TouchableOpacity
            onPress={async () => {
              if (!password || !confirmPassword) {
                Alert.alert("Error", "Please fill in all fields");
                return;
              }

              if (password !== confirmPassword) {
                Alert.alert("Error", "Passwords do not match");
                return;
              }

              if (password.length < 6) {
                Alert.alert(
                  "Error",
                  "Password must be at least 6 characters long"
                );
                return;
              }

              // Additional password validation
              if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                Alert.alert(
                  "Error",
                  "Password must contain at least one uppercase letter, one lowercase letter, and one number"
                );
                return;
              }

              setIsSubmitting(true);

              try {
                // Try the canonical key first, then fallback to older key if present
                let resetCode = await AsyncStorage.getItem("resetCode");
                if (!resetCode) {
                  const legacy = await AsyncStorage.getItem("resetToken");
                  if (legacy) {
                    resetCode = legacy;
                  }
                }
                resetCode = (resetCode || "")
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "");
                console.log("Retrieved reset code (normalized):", resetCode);

                if (!resetCode) {
                  Alert.alert(
                    "Error",
                    "Reset code not found. Please try the reset process again."
                  );
                  return;
                }

                console.log(
                  "Sending reset password with code for email:",
                  emailAddress
                );
                const result = await authService.resetPasswordWithCode(
                  emailAddress,
                  resetCode,
                  password
                );

                if (result.success) {
                  await AsyncStorage.removeItem("resetCode"); // Clean up
                  await AsyncStorage.removeItem("resetToken");
                  Alert.alert("Success", "Password reset successfully!", [
                    {
                      text: "OK",
                      onPress: () => router.replace("/auth/login"),
                    },
                  ]);
                } else {
                  Alert.alert(
                    "Error",
                    result.data?.message || "Failed to reset password"
                  );
                }
              } catch (error) {
                console.error("Error resetting password:", error);
                Alert.alert(
                  "Error",
                  "Failed to reset password. Please try again."
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="bg-[#090E24] p-2 rounded-full mt-4 w-[333px] h-[45px]"
          >
            <Text className="text-white text-center mt-2">
              {isSubmitting ? "Resetting..." : "Submit"}
            </Text>
          </TouchableOpacity>

          <Text className="text-1xl font-semibold mt-9">
            REMEMBER YOUR PASSWORD?
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            className="mt-2"
          >
            <Text className="text-[#344054] text-sm underline-none font-medium mt-9">
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
