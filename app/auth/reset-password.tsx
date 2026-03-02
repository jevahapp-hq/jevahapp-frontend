import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ResetPassword() {
  return (
    <View className="flex flex-col justify-center px-4 mt-6 mx-auto md:px-8 lg:px-12">
      <View className="flex flex-col w-full md:w-[450px] lg:w-[500px]">
        <Text className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-[#1D2939]">
          Reset Password
        </Text>
        <Text className="mt-4 text-[#1D2939] text-base md:text-lg lg:text-xl">
          Enter your email address and we'll send you a code to reset your password.
        </Text>
      </View>

      <View className="flex flex-col w-full md:w-[450px] lg:w-[500px]">
        <View className="flex flex-row rounded-[15px] w-full md:w-[450px] lg:w-[500px] h-[56px] md:h-[64px] lg:h-[72px] border border-[#9D9FA7] items-center justify-center mt-6">
          <MaterialCommunityIcons
            name="email-outline"
            size={15}
            color="black"
            className="md:w-5 md:h-5 lg:w-6 lg:h-6"
          />
          <TextInput
            placeholder="Email"
            className="border-hidden outline-none w-[250px] md:w-[300px] lg:w-[350px] h-[40px] md:h-[48px] lg:h-[56px] ml-2 text-base md:text-lg lg:text-xl"
          />
        </View>

        <TouchableOpacity
          onPress={() => router.push("/auth/verify-reset")}
          className="bg-[#090E24] p-2 rounded-full mt-6 w-full md:w-[450px] lg:w-[500px] h-[45px] md:h-[52px] lg:h-[60px]"
        >
          <Text className="text-white text-center text-base md:text-lg lg:text-xl">Send Reset Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/auth/login")}
          className="mt-4"
        >
          <Text className="text-[#344054] text-sm md:text-base lg:text-lg underline-none font-medium text-center">
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 