import { router } from "expo-router";
import { View, Text, Image, TextInput, TouchableOpacity } from "react-native";


export default function EmailSeen() {
  return (
    <View className="flex justify-center px-6 rounded-4xl mt-6 w-[393px] h-[480px]">
      <View className="flex flex-col justify-center items-center w-[333px]">
    

<View className="w-[36px] h-[4px] bg-gray-300 self-center rounded-full mb-6 mt-0" />
        <Image source={require("../../assets/images/Clip path group.png")} />

        <Text className="text-[32px] font-rubik-semibold mb-4 mt-4 text-[#1D2939] text-clip text-center">You’ve got an email</Text>

        <Text className="text-[15px] mb-4 mt-4 text-[#344054] font-rubik text-clip text-center">Check your email, we’ve sent you a verification code. Enter the code in the next screen.</Text>

        <TouchableOpacity
        onPress={() => router.push("/auth/codeVerification")}
        className="bg-[#090E24] p-2 rounded-full  mt-4 w-[333px] h-[45px]"
      >
        <Text className="text-white text-center mt-1">Okay, Got It</Text>
      </TouchableOpacity>

      </View>

    </View>
  );
}





