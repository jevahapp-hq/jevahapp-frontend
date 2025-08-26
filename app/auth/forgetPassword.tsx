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
import authService from "../services/authService";
import EmailResetSeenModal from "./emailResetSeen";

const { width, height } = Dimensions.get('window');
const API_BASE_URL = Constants.expoConfig?.extra?.API_URL;

export default function ForgotPassword() {
  const [showEmailResetModal, setShowEmailResetModal] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    console.log("Submit button pressed, email:", email);
    
    if (!email.trim()) {
      console.log("Email is empty, not showing modal");
      alert("Please enter an email address");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Send forget password request to backend
      console.log("Sending forgot password request to backend");
      const result = await authService.forgotPassword(email.trim());

      if (result.success) {
        console.log("Backend request successful, showing modal");
        setShowEmailResetModal(true);
      } else {
        console.log("Backend request failed:", result.data?.message);
        alert(result.data?.message || "Failed to send reset email. Please try again.");
      }
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <View className="flex flex-col justify-center px-4 py-6 mx-auto md:px-8 lg:px-12">
            <View className="flex flex-col w-full max-w-[500px] mx-auto">
              <Text className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-[#1D2939]">
                Forgot Password?
              </Text>
              <Text className="mt-3 sm:mt-4 text-[#1D2939] text-sm sm:text-base md:text-lg lg:text-xl">
                Don't worry! It happens. Please enter the email address associated with your account.
              </Text>
            </View>

            <View className="flex flex-col w-full max-w-[500px] mx-auto mt-6">
              <View className="flex flex-row rounded-[15px] w-full h-[50px] sm:h-[56px] md:h-[64px] lg:h-[72px] border border-[#9D9FA7] items-center justify-center">
                <Image 
                  source={require("../../assets/images/email-icon.png")} 
                  className="w-5 h-5 sm:w-6 sm:h-6"
                />
                <TextInput
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  className="border-hidden outline-none w-[200px] sm:w-[250px] md:w-[300px] lg:w-[350px] h-[40px] sm:h-[45px] md:h-[48px] lg:h-[56px] ml-2 text-sm sm:text-base md:text-lg lg:text-xl"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Submit Button */}
              <View className="flex flex-col mt-16 sm:mt-20 md:mt-24 justify-center items-center w-full">
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  className={`bg-[#090E24] p-2 rounded-full w-full h-[42px] sm:h-[45px] md:h-[52px] lg:h-[60px] items-center justify-center ${
                    isSubmitting ? "opacity-50" : ""
                  }`}
                >
                  <Text className="text-white text-center text-sm sm:text-base md:text-lg lg:text-xl">
                    {isSubmitting ? "Sending..." : "Submit"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/auth/login")}
                  className="mt-4"
                >
                  <Text className="text-[#344054] text-xs sm:text-sm md:text-base lg:text-lg underline-none font-medium text-center">
                    Back to Login
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
