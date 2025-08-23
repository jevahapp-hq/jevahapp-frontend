import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import AuthHeader from "../components/AuthHeader";

export default function ForgotPassword() {
  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <AuthHeader
        title="Forgot Password"
        showBack={true}
        showCancel={false}
      />

      {/* Main Content */}
      <View className="flex-1 px-4 pt-4">
        {/* Title Section */}
        <View className="mb-6">
          <Text className="text-4xl font-rubik font-bold mb-4 text-[#3B3B3B]">
            Forgot Password?
          </Text>
          <Text className="text-[#3B3B3B] font-rubik">
            Enter your email, and we'll send a link to reset your password.
          </Text>
        </View>

        {/* Email Input */}
        <View className="flex-row rounded-[15px] h-[56px] border border-[#9D9FA7] items-center px-4 mb-6">
          <FontAwesome6 name="envelope" size={15} color="#3B3B3B" />
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#9D9FA7"
            className="flex-1 ml-3 font-rubik text-base text-[#3B3B3B]"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={() => router.push("/auth/emailResetSeen")}
          className="bg-[#090E24] rounded-full h-[45px] items-center justify-center mb-6"
        >
          <Text className="text-white font-rubik font-semibold text-base">
            Submit
          </Text>
        </TouchableOpacity>

        {/* Remember Password Section */}
        <View className="items-center">
          <Text className="text-lg font-rubik font-semibold text-[#3B3B3B] mb-4">
            REMEMBER YOUR PASSWORD?
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
          >
            <Text className="text-[#3B3B3B] font-rubik font-medium text-base underline">
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
