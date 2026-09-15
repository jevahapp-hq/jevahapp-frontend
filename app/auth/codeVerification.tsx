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
import { pickAuthSession } from "../utils/pickAuthSession";
import { storeSessionToken } from "../utils/sessionAuth";
import {
  clearPendingSignup,
  fillVerificationBoxes,
  normalizeVerificationCode,
  resolveSignupCredentials,
  shouldLoginAfterVerifyFailure,
} from "../utils/pendingSignup";

export default function CodeVerification() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [codeArray, setCodeArray] = useState(["", "", "", "", "", ""]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [failureText, setFailureText] = useState("Invalid code");

  const dropdownAnim = useRef(new RNAnimated.Value(-200)).current;
  const credentials = resolveSignupCredentials(params as Record<string, unknown>);
  const emailAddress = credentials.email;
  const password = credentials.password;

  // Refs to control focus across code inputs
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const verifyLock = useRef(false);

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
    const newCode = fillVerificationBoxes(codeArray, text, index);
    setCodeArray(newCode);

    const filled = newCode.filter(Boolean).length;
    if (filled >= 6) {
      inputsRef.current[5]?.focus();
      return;
    }
    if (text.length > 1) {
      const nextEmpty = newCode.findIndex((char) => !char);
      inputsRef.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
      return;
    }
    if (text && index < 5) {
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

  const triggerBounceDrop = (type: "success" | "failure", message?: string) => {
    if (type === "success") {
      setShowFailure(false);
      setShowSuccess(true);
    } else {
      setFailureText(message || "Invalid code");
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
            void import("../components/loginTour/loginTourStorage").then(
              ({ markLoginTourPending }) => markLoginTourPending()
            );
            router.replace("/Profile/profileSetUp");
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

  const completeVerifiedSession = async (
    token: string | null,
    user: any | null
  ) => {
    if (!token) {
      Alert.alert(
        "Email verified",
        "Your email is verified. Please sign in to continue."
      );
      clearPendingSignup();
      router.replace("/auth/login");
      return;
    }

    await storeSessionToken(token);
    if (user) {
      await AsyncStorage.setItem("user", JSON.stringify(user));
    }

    try {
      const me = await authService.fetchMe();
      if (me?.success) {
        const backendUser = (me.data?.data?.user || me.data?.user) as any;
        if (backendUser && (backendUser.firstName || backendUser.lastName)) {
          await AsyncStorage.setItem("user", JSON.stringify(backendUser));
        }
      }
    } catch {}

    try {
      const { useInteractionStore } = await import(
        "@/store/useInteractionStore"
      );
      useInteractionStore.getState().clearCache();
    } catch {}

    clearPendingSignup();
    triggerBounceDrop("success");
  };

  const tryLoginAfterVerify = async () => {
    if (!password) return { token: null as string | null, user: null as any };
    const loginResult = await authService.login(emailAddress, password);
    const loginSession = pickAuthSession(loginResult.data);
    return {
      token: loginResult.success ? loginSession.token : null,
      user: loginSession.user,
    };
  };

  const onVerifyPress = async () => {
    if (verifyLock.current) return;
    verifyLock.current = true;
    setIsVerifying(true);
    const code = normalizeVerificationCode(codeArray.join(""));

    if (!emailAddress) {
      triggerBounceDrop("failure", "Missing email. Go back and sign up again.");
      setIsVerifying(false);
      verifyLock.current = false;
      return;
    }

    if (code.length !== 6) {
      triggerBounceDrop("failure", "Enter the 6-character code");
      setIsVerifying(false);
      verifyLock.current = false;
      return;
    }

    try {
      const result = await authService.verifyEmailCode(emailAddress, code);
      const verifyMessage =
        result.data?.message || result.error || "";

      if (result.success) {
        const verifySession = pickAuthSession(result.data);
        let token = verifySession.token;
        let user = verifySession.user;

        if (!token) {
          const loggedIn = await tryLoginAfterVerify();
          token = loggedIn.token;
          user = loggedIn.user || user;
        }

        await completeVerifiedSession(token, user);
        return;
      }

      // A valid code can still return 429 if a duplicate verify already
      // succeeded. Log in with the signup password instead of forcing a resend.
      if (shouldLoginAfterVerifyFailure(result.status, verifyMessage)) {
        const loggedIn = await tryLoginAfterVerify();
        if (loggedIn.token) {
          await completeVerifiedSession(loggedIn.token, loggedIn.user);
          return;
        }
      }

      const errorMessage =
        result.status === 429
          ? result.data?.message ||
            "Too many attempts. Wait a bit, then tap Verify once with the same code."
          : result.data?.message ||
            result.error ||
            "Invalid verification code. Please try again.";
      Alert.alert("Verification Failed", errorMessage);
      triggerBounceDrop("failure", errorMessage);
    } catch (err: any) {
      console.error("❌ Error verifying code:", err);

      let errorMessage = "Unable to verify code. Try again later.";
      if (err.name === "AbortError") {
        errorMessage =
          "Request timeout. Please check your connection and try again.";
      } else if (err.message?.includes("Network request failed")) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      Alert.alert("Server Error", errorMessage);
      triggerBounceDrop("failure", errorMessage);
    } finally {
      setIsVerifying(false);
      verifyLock.current = false;
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      console.log("🔍 Resending email verification for:", emailAddress);

      // Use authService for resending email verification
      const result = await authService.resendEmailVerification(emailAddress);
      console.log("✅ Resend email verification result:", result);

      if (result.success) {
        setCodeArray(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();
        Alert.alert(
          "Code Resent",
          "A new verification code has been sent to your email. Use the latest code."
        );
      } else {
        const errorMessage = result.data?.message || "Try again later.";
        triggerBounceDrop("failure", errorMessage);
        Alert.alert("Resend Failed", errorMessage);
      }
    } catch (err: any) {
      console.error("❌ Error resending code:", err);

      let errorMessage = "Failed to resend code. Try again later.";
      if (err.name === "AbortError") {
        errorMessage =
          "Request timeout. Please check your connection and try again.";
      } else if (err.message?.includes("Network request failed")) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      Alert.alert("Resend Failed", errorMessage);
      triggerBounceDrop("failure", errorMessage);
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
        <AuthHeader title="Code Verification" />
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
        {showSuccess && <SuccessfulCard text="Successfully verified" />}
        {showFailure && (
          <FailureCard text={failureText} onClose={hideDropdown} />
        )}
      </RNAnimated.View>

      <View className="w-[333px] mt-10 ml-2">
        <Text className="text-4xl font-bold text-[#1D2939]">
          Verify with code
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
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={i === 0 ? 6 : 1}
            textContentType={i === 0 ? "oneTimeCode" : "none"}
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
            <Icon name="star" size={16} color="#FEA74E" />
          </Animated.View>
        )}
      </TouchableOpacity>

      <View style={{ flexDirection: "row", marginTop: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>
          Didn't get a code?{" "}
        </Text>
        <TouchableOpacity onPress={handleResend} disabled={isResending}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#FEA74E" }}>
            {isResending ? "Resending..." : "Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
