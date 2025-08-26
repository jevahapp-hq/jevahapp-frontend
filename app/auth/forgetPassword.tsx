import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AuthHeader from "../components/AuthHeader";
import EmailResetSeenModal from "./emailResetSeen";

const { width, height } = Dimensions.get('window');
const API_BASE_URL = Constants.expoConfig?.extra?.API_URL;

export default function ForgotPassword() {
  const [showEmailResetModal, setShowEmailResetModal] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <AuthHeader
            title="Forgot Password"
            showBack={true}
            showCancel={true}
          />

          {/* Main Content */}
          <View className="flex-1 px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8">
            {/* Content Container - Aligned */}
            <View className="flex flex-col w-full max-w-[333px] mx-auto">
              {/* Title Section */}
              <View className="mb-6 sm:mb-8 md:mb-10">
                <Text className="text-[28px] sm:text-[32px] md:text-[36px] lg:text-[40px] font-rubik-semibold mb-4 text-[#1D2939] leading-tight">
                  Forgot Password?
                </Text>
                <Text className="text-[14px] sm:text-[16px] md:text-[18px] text-[#344054] font-rubik leading-relaxed">
                  Enter your email, and we'll send a link to reset your password.
                </Text>
              </View>

              {/* Email Input */}
              <View className="flex flex-col w-full mt-4 sm:mt-6 md:mt-8">
              <View className="flex flex-row rounded-[15px] h-[50px] sm:h-[56px] md:h-[60px] border border-[#9D9FA7] items-center px-3 sm:px-4">
                <Image
                  source={require("../../assets/images/mail.png")}
                  className="w-[18px] h-[16px] sm:w-[20px] sm:h-[18px]"
                />
                <TextInput
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="ml-3 sm:ml-5 w-full text-[14px] sm:text-[16px]"
                  placeholderTextColor="#090E24"
                />
              </View>
            </View>

            {/* Submit Button */}
            <View className="flex flex-col mt-16 sm:mt-20 md:mt-24 justify-center items-center w-full">
              <TouchableOpacity
                onPress={async () => {
                  console.log("Submit button pressed, email:", email);
                  console.log("Current modal state:", showEmailResetModal);
                  
                  if (!email.trim()) {
                    console.log("Email is empty, not showing modal");
                    alert("Please enter an email address");
                    return;
                  }

                  // Show modal immediately when email is entered
                  console.log("Setting modal to true");
                  setShowEmailResetModal(true);

                  // Optional: Still send the request to backend in the background
                  setIsSubmitting(true);
                  
                  try {
                    // Send forget password request to backend
                    const response = await fetch(`${API_BASE_URL}/api/auth/forget-password`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: email.trim() }),
                    });

                    const data = await response.json();

                    if (!data.success) {
                      console.log("Backend request failed:", data.message);
                      // You can optionally show an error message here if needed
                    }
                  } catch (error) {
                    console.error("Error sending reset email:", error);
                    // You can optionally show an error message here if needed
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="bg-[#090E24] p-2 rounded-full mt-3 w-full max-w-[333px] h-[45px] sm:h-[50px] md:h-[55px] items-center justify-center"
              >
                <Text className="text-white text-center font-rubik text-[14px] sm:text-[16px] font-semibold">
                  {isSubmitting ? "Sending..." : "Submit"}
                </Text>
              </TouchableOpacity>

              <Text className="text-[12px] sm:text-[14px] md:text-[16px] font-semibold mt-8 sm:mt-9 text-[#101828] text-center">
                REMEMBER YOUR PASSWORD?
              </Text>

              <TouchableOpacity
                onPress={() => router.push("/auth/login")}
                className="mt-6 sm:mt-8"
              >
                <Text className="text-[#344054] text-[12px] sm:text-[14px] font-medium text-center">
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Email Reset Modal */}
      <EmailResetSeenModal
        isVisible={showEmailResetModal}
        onClose={() => setShowEmailResetModal(false)}
        emailAddress={email}
      />
    </SafeAreaView>
  );
}
