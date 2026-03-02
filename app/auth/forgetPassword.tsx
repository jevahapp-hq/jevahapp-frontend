import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AuthHeader from "../components/AuthHeader";
import EmailResetSeenModal from "./emailResetSeen";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [showEmailResetModal, setShowEmailResetModal] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = () => {
    // Clear previous errors
    setEmailError("");

    // Validate email
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    if (!validateEmail(email.trim().toLowerCase())) {
      setEmailError("Invalid email format");
      return;
    }

    // Show modal to proceed with password reset
    console.log("Email validated, showing reset modal for:", email.trim());
    setShowEmailResetModal(true);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 mt-6">
        <AuthHeader title="Forgot Password" />
      </View>

      {/* Main Content */}
      <View className="flex-1 w-full items-center mt-8 bg-[#FCFCFD]">
        <View className="w-[333px]">
          {/* Title Section */}
          <Text className="font-rubik-semibold text-[32px] text-[#1D2939] mb-4">
            Forgot Password?
          </Text>
          
          <Text className="text-[16px] text-[#667085] font-rubik leading-6 mb-8">
            Don't worry! It happens. Please enter the email address associated with your account.
          </Text>

          {/* Email Input Field */}
          <View className="flex flex-col w-[333px] mb-6">
            <View className="flex flex-row rounded-[15px] h-[56px] border border-[#9D9FA7] items-center px-3">
              <Ionicons 
                name="mail-outline" 
                size={18} 
                color="#6B7280" 
              />
              <TextInput
                placeholder="Enter your email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError(""); // Clear error when user types
                }}
                className="ml-3 flex-1 text-[#090E24] text-[16px]"
                placeholderTextColor="#9D9FA7"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {emailError && (
              <Text className="text-red-500 text-sm mt-1 ml-1">{emailError}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Bottom Section */}
      <View className="w-full items-center mb-32">
        <View className="w-[333px] flex flex-col items-center">
          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-[#090E24] rounded-full w-[333px] h-[48px] items-center justify-center mb-3"
          >
            <Text className="text-white text-center text-base font-semibold">
              Submit
            </Text>
          </TouchableOpacity>

          {/* Back to Login Link */}
          <View className="items-center mt-6">
            <Text className="text-[14px] font-semibold text-[#1D2939] ">
              REMEMBER YOUR PASSWORD?
            </Text>
            <TouchableOpacity onPress={() => router.push("/auth/login")}>
              <Text className="text-[#344054] text-[14px] font-rubik mt-6">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Email Reset Modal */}
      <EmailResetSeenModal
        isVisible={showEmailResetModal}
        onClose={() => setShowEmailResetModal(false)}
        emailAddress={email}
      />
    </View>
  );
}
