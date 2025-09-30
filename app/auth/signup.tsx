
import { useSignUp } from "@clerk/clerk-expo";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import AuthHeader from "../components/AuthHeader";
import authService from "../services/authService";
import VerifyEmail from "./verifyEmail";

export default function SignUpScreen() {
  const { isLoaded, signUp } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");

  // Debug password visibility
  console.log('Password visibility state:', showPassword);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return (
      password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password)
    );
  };

  const clearErrors = useCallback(() => {
    setEmailError("");
    setPasswordError("");
    setFirstNameError("");
    setLastNameError("");
  }, []);

  const validateForm = useCallback(() => {
    let isValid = true;
    clearErrors();

    // Validation logic
    if (!firstName.trim()) {
      setFirstNameError("First name is required");
      isValid = false;
    }

    if (!lastName.trim()) {
      setLastNameError("Last name is required");
      isValid = false;
    }

    if (!emailAddress.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!validateEmail(emailAddress)) {
      setEmailError("Invalid email format");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (!validatePassword(password)) {
      setPasswordError(
        "Password must be at least 6 characters long and include both letters and numbers"
      );
      isValid = false;
    }

    return isValid;
  }, [firstName, lastName, emailAddress, password, clearErrors]);

  const handleSignUpValidation = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log("🔍 Starting registration for:", emailAddress);
      
      const result = await authService.register({
        email: emailAddress,
        password,
        firstName,
        lastName,
      });

      console.log("✅ Registration result:", result);

      if (result.success) {
        // Show success modal and proceed to verification
        setShowModal(true);
      } else {
        // Handle API error
        const errorMessage = result.data?.message || result.error || "Registration failed. Please try again.";
        alert(errorMessage);
      }
    } catch (err: any) {
      console.error("❌ Registration error:", err);
      
      let errorMessage = "Registration failed. Please try again.";
      if (err.name === 'AbortError') {
        errorMessage = "Request timeout. Please check your connection and try again.";
      } else if (err.message?.includes('Network request failed')) {
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [validateForm, emailAddress, password, firstName, lastName]);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setIsLoading(false);
  }, []);

  const handleVerifySuccess = useCallback(() => {
    setShowModal(false);
    setIsLoading(false);
    // Navigate to verification screen
    router.push({
      pathname: "/auth/codeVerification",
      params: {
        emailAddress,
        firstName,
        lastName,
        password, // Include password for automatic login after verification
      },
    });
  }, [router, emailAddress, firstName, lastName, password]);

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 mt-6">
        <AuthHeader title="Sign Up" />
      </View>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View
          className="flex-1 items-center justify-start"
          style={{ paddingBottom: 50 }}
        >
          <View className="flex flex-col justify-center items-start h-[140px] w-[333px] mt-2 bg-[#FCFCFD]">
            <Text className="font-rubik-semibold text-[#1D2939] text-star text-[40px]">
              Welcome to the {"\n"}family!{" "}
              <Image
                source={{
                  uri: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f917/512.gif",
                }}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />
            </Text>
            <Text className="mt-2 font-rubik text-[15px] w-full text-[#344054] text-start">
              Sign up with your email. We promise no spam, just blessings.
            </Text>
          </View>

          <View className="flex flex-col justify-center mt-4 items-center w-[333px]">
            {/* First Name */}
            <View className="flex flex-col w-[333px] mt-2">
              <View className="flex flex-row rounded-[15px] h-[56px] border border-[#9D9FA7] items-center px-3">
                <Image
                  source={require("../../assets/images/user.png")}
                  className="w-[24px] h-[24px]"
                />
                <TextInput
                  placeholder="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  className="ml-3 w-full text-[#090E24]"
                  placeholderTextColor="#090E24"
                  editable={!isLoading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
              {firstNameError && (
                <Text className="text-red-500 text-sm mt-1">
                  {firstNameError}
                </Text>
              )}
            </View>

            {/* Last Name */}
            <View className="flex flex-col w-[333px] mt-2">
              <View className="flex flex-row rounded-[15px] h-[56px] border border-[#9D9FA7] items-center px-3">
                <Image
                  source={require("../../assets/images/user.png")}
                  className="w-[24px] h-[24px]"
                />
                <TextInput
                  placeholder="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  className="ml-3 w-full text-[#090E24]"
                  placeholderTextColor="#090E24"
                  editable={!isLoading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
              {lastNameError && (
                <Text className="text-red-500 text-sm mt-1">
                  {lastNameError}
                </Text>
              )}
            </View>

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
                  className="ml-5 w-full"
                  placeholderTextColor="#090E24"
                  editable={!isLoading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
              {emailError && (
                <Text className="text-red-500 text-sm mt-1">{emailError}</Text>
              )}
            </View>

            {/* Password Field */}
            <View className="flex flex-col w-[333px] mt-2">
              <View className="flex flex-row rounded-[15px] h-[56px] border border-[#9D9FA7] items-center px-3">
                <Image source={require('../../assets/images/lock.png')} className="w-[20px] h-[18px]" />
                <TextInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  className="ml-6 flex-1 text-[#090E24]"
                  placeholderTextColor="#090E24"
                  style={{ 
                    color: '#090E24',
                    fontSize: 16,
                    fontWeight: '400'
                  }}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <FontAwesome6
                    name={showPassword ? "eye-slash" : "eye"}
                    size={18}
                    color="#666666"
                  />
                </TouchableOpacity>
              </View>
              {passwordError && (
                <Text className="text-red-500 text-sm mt-1">
                  {passwordError}
                </Text>
              )}
            </View>
          </View>

          {/* Sign Up Button */}
          <View className="flex flex-col mt-8 justify-center items-center w-full">
            <TouchableOpacity
              onPress={handleSignUpValidation}
              disabled={isLoading}
              className={`p-2 rounded-full mt-3 w-[333px] h-[45px] flex-row items-center justify-center ${
                isLoading ? 'bg-gray-400' : 'bg-[#090E24]'
              }`}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white text-center font-rubik ml-2">Signing Up...</Text>
                </>
              ) : (
                <Text className="text-white text-center font-rubik">Sign Up</Text>
              )}
            </TouchableOpacity>

            <Text className="text-1xl font-semibold mt-9">
              ALREADY HAVE AN ACCOUNT?
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              className="mt-9"
              disabled={isLoading}
            >
              <Text className="text-[#344054] text-sm font-medium">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <VerifyEmail
        visible={showModal}
        onClose={handleModalClose}
        onVerify={handleVerifySuccess}
        emailAddress={emailAddress}
        password={password}
        firstName={firstName}
        lastName={lastName}
      />
    </View>
  );
}
