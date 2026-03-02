import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated as RNAnimated,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/FontAwesome";
import AuthHeader from "../components/AuthHeader";
import FailureCard from "../components/failureCard";
import SuccessfulCard from "../components/successfulCard";
import authService from "../services/authService";

export default function VerifyReset() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [codeArray, setCodeArray] = useState(["", "", "", "", "", ""]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const dropdownAnim = useRef(new RNAnimated.Value(-200)).current;
  const emailAddress = params.emailAddress as string;

  // Debug logging
  console.log("🔍 VerifyReset component loaded");
  console.log("🔍 Params received:", params);
  console.log("🔍 Email address from params:", emailAddress);

  // Refs to control focus across code inputs
  const inputsRef = useRef<Array<TextInput | null>>([]);

  const FLOOR_Y = 280;
  const FINAL_REST_Y = 70;

  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isVerifying) {
      rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1);
    } else {
      rotation.value = 0;
    }
  }, [isVerifying]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleCodeChange = (text: string, index: number) => {
    // If user pasted/auto-filled multiple characters starting at this index, distribute them
    if (text.length > 1) {
      const sanitized = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const newCode = [...codeArray];
      let writeIndex = index;
      for (let i = 0; i < sanitized.length && writeIndex < 6; i += 1) {
        newCode[writeIndex] = sanitized[i];
        writeIndex += 1;
      }
      setCodeArray(newCode);
      // Focus the next empty input if available
      if (writeIndex < 6) {
        inputsRef.current[writeIndex]?.focus();
      }
      return;
    }

    const char = text.slice(-1).toUpperCase();
    if (!/^[A-Z0-9]?$/.test(char)) return;

    const newCode = [...codeArray];
    newCode[index] = char;
    setCodeArray(newCode);

    // Auto-advance focus when a character is entered
    if (char !== "" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace") {
      const newCode = [...codeArray];
      if (newCode[index] === "") {
        // Move focus back and clear previous if current is already empty
        if (index > 0) {
          newCode[index - 1] = "";
          setCodeArray(newCode);
          inputsRef.current[index - 1]?.focus();
        }
      } else {
        newCode[index] = "";
        setCodeArray(newCode);
      }
    }
  };

  const triggerBounceDrop = (type: "success" | "failure") => {
    if (type === "success") {
      setShowFailure(false);
      setShowSuccess(true);
    } else {
      setShowSuccess(false);
      setShowFailure(true);
    }

    RNAnimated.timing(dropdownAnim, {
      toValue: FLOOR_Y,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      RNAnimated.spring(dropdownAnim, {
        toValue: FINAL_REST_Y,
        useNativeDriver: true,
        bounciness: 10,
        speed: 5,
      }).start(() => {
        if (type === "success") {
          setTimeout(() => {
            // Navigate to reset password screen with email parameter
            router.replace({
              pathname: "/auth/resetPassword",
              params: { emailAddress },
            });
          }, 600);
        }
      });
    });
  };

  const hideDropdown = () => {
    RNAnimated.spring(dropdownAnim, {
      toValue: -200,
      useNativeDriver: true,
      speed: 10,
      bounciness: 6,
    }).start(() => {
      setShowSuccess(false);
      setShowFailure(false);
    });
  };

  const onVerifyPress = async () => {
    console.log("🔍 Verify button pressed");
    setIsVerifying(true);
    const code = codeArray.join("");
    console.log("🔍 Code entered:", code);

    if (code.length !== 6) {
      console.log("❌ Code length is not 6 characters");
      triggerBounceDrop("failure");
      setIsVerifying(false);
      return;
    }

    try {
      console.log(
        "🔍 Verifying reset code for email:",
        emailAddress,
        "code:",
        code
      );

      const result = await authService.verifyResetCode(emailAddress, code);
      console.log("🔍 Verify result:", result);

      if (result.success) {
        // Store normalized code under unified key 'resetCode'
        const normalized = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        console.log("✅ Storing reset code (normalized):", normalized);
        await AsyncStorage.setItem("resetCode", normalized);
        triggerBounceDrop("success");
      } else {
        console.log("❌ Verification failed:", result.data?.message);
        triggerBounceDrop("failure");
      }
    } catch (err) {
      console.error("❌ Error verifying reset code:", err);
      Alert.alert("Server Error", "Unable to verify code. Try again later.");
      triggerBounceDrop("failure");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    console.log("🔄 Resend button pressed for email:", emailAddress);
    
    if (!emailAddress || !emailAddress.trim()) {
      Alert.alert("Error", "Email address is required");
      return;
    }

    setIsResending(true);
    setShowFailure(false); // Clear any previous failure state
    
    try {
      console.log("🔄 Calling authService.forgotPassword for resend...");
      const result = await authService.forgotPassword(emailAddress);
      console.log("🔄 Resend result:", result);

      if (result.success) {
        console.log("✅ Resend successful");
        // Show success message (even if user not found, for security)
        const message = result.data?.message || "A new password reset code has been sent to your email. Please check your inbox and spam folder.";
        Alert.alert(
          "Code Resent",
          message,
          [{ text: "OK" }]
        );
      } else {
        console.log("❌ Resend failed:", result.error || result.data?.message);
        const errorMessage = result.error || result.data?.message || "Failed to resend code. Please try again later.";
        
        // Don't show failure card for resend - just show alert
        Alert.alert(
          "Resend Failed",
          errorMessage,
          [{ text: "OK" }]
        );
      }
    } catch (err: any) {
      console.error("❌ Error resending reset code:", err);
      const errorMessage = err?.message || "Network error. Please check your connection and try again.";
      Alert.alert(
        "Resend Failed",
        errorMessage,
        [{ text: "OK" }]
      );
    } finally {
      setIsResending(false);
    }
  };

  const getInputStyle = (): TextStyle =>
    ({
      height: 40,
      width: 40,
      fontSize: 18,
      textAlign: "center",
      textAlignVertical: "center",
      includeFontPadding: false,
      padding: 0,
      margin: 0,
      borderWidth: 1,
      borderColor: "#9D9FA7",
      borderRadius: 9,
      backgroundColor: "white",
    } as TextStyle);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center" }}>
      <View className="w-[370px] mt-6">
        <AuthHeader title="Reset Code Verification" />
      </View>

      <RNAnimated.View
        style={{
          position: "absolute",
          width: "100%",
          alignItems: "center",
          backgroundColor: "#F9FAFB",
          paddingHorizontal: 16,
          transform: [{ translateY: dropdownAnim }],
          zIndex: 10,
        }}
      >
        {showSuccess && <SuccessfulCard text="Code verified successfully" />}
        {showFailure && (
          <FailureCard text="Invalid reset code" onClose={hideDropdown} />
        )}
      </RNAnimated.View>

      <View className="w-[333px] mt-10 ml-2">
        <Text className="text-4xl font-bold text-[#1D2939]">
          Verify reset code
        </Text>
        <Text className="mt-2 text-base text-[#1D2939]">
          Enter the 6-character code we sent to {emailAddress}
        </Text>
      </View>

      <View style={{ flexDirection: "row", marginTop: 30, gap: 12 }}>
        {codeArray.map((char, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            value={char}
            onChangeText={(text) => handleCodeChange(text, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            keyboardType="default"
            autoCapitalize="characters"
            textContentType="oneTimeCode"
            autoFocus={i === 0}
            selectTextOnFocus
            style={getInputStyle()}
          />
        ))}
      </View>

      <TouchableOpacity
        onPress={onVerifyPress}
        disabled={isVerifying}
        style={{
          backgroundColor: "#090E24",
          height: 45,
          width: 333,
          marginTop: 40,
          borderRadius: 999,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>
          {isVerifying ? "Verifying..." : "Verify"}
        </Text>
        {isVerifying && (
          <Animated.View style={[{ marginLeft: 8 }, animatedStyle]}>
            <Icon name="star" size={16} color="#6663FD" />
          </Animated.View>
        )}
      </TouchableOpacity>

      <View style={{ flexDirection: "row", marginTop: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>
          Didn't get a code?{" "}
        </Text>
        <TouchableOpacity onPress={handleResend} disabled={isResending}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#6663FD" }}>
            {isResending ? "Resending..." : "Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
