import { router } from "expo-router";
import { View, Text,  TextInput, TouchableOpacity } from "react-native";


import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";


import AuthHeader from "../components/AuthHeader";
export default function ForgotPassword() {
  return (

    <View className="flex flex-col justify-center w-[333px]  mx-auto bg-white">
 <View className="px-5 mt-6 ">
        <AuthHeader title="Forgot Password" />
      </View>
<View className="flex flex-col w-[333px] h-[176px] mt-6 bg-[#FCFCFD]">


     <Text className="text-4xl font-bold mb-4 text-[#1D2939]">
     Forgot Password?

      </Text>
      <Text className="  mt-4 text-[#1D2939]">
      Enter your email, and we’ll send a link to reset your password. 
      </Text>


</View>

<View className="flex flex-row rounded-[15px] w-[333px] h-[56px] border border-[#9D9FA7] items-center justify-center mt-2">
      

        <FontAwesome6 name="unlock-keyhole" size={15} color="black" />
        <TextInput
          placeholder="Password"
          className="border-hidden outline-none w-[250px] h-[40px] ml-2 "
        />

<FontAwesome5 name="eye-slash" size={15} color="black" />
      </View>




      <View className="flex flex-col mt-36 justify-center items-center h-[113px] w-[333px]">
        <TouchableOpacity
          onPress={() => router.push("/auth/emailResetSeen")}
          className="bg-[#090E24] p-2 rounded-full  mt-4 w-[333px] h-[45px]"
        >
          <Text className="text-white text-center mt-2">Submit</Text>
        </TouchableOpacity>

        <Text className="text-1xl font-semibold mt-6">
        REMEMBER YOUR PASSWORD?
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/auth/login")}
          className="mt-2"
        >
          <Text className="text-[#344054] text-sm underline-none font-medium mt-4">
            Sign in
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
