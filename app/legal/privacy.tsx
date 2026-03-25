import { ScrollView, Text, View } from "react-native";

import AuthHeader from "../components/AuthHeader";

export default function PrivacyPolicyScreen() {
    return (
        <View className="flex-1 bg-white">
            <View className="px-4 mt-6">
                <AuthHeader title="Privacy Policy" />
            </View>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                <Text className="text-sm text-gray-500 mb-6">Last Updated: 23rd March 2026</Text>

                <Text className="font-bold text-[#090E24] mb-2">1. INTRODUCTION</Text>
                <Text className="text-[#344054] mb-6">Jevah App (“we”, “our”, or “us”) respects your privacy and is committed to protecting your personal data in accordance with the Nigeria Data Protection Act (NDPA 2023).{"\n"}By using Jevah App, you agree to this Privacy Policy.</Text>

                <Text className="font-bold text-[#090E24] mb-2">2. INFORMATION WE COLLECT</Text>
                <Text className="text-[#344054] mb-2">We may collect:</Text>
                <View className="pl-2 mb-6">
                    <Text className="text-[#344054]">• Personal Information: name, email, phone number</Text>
                    <Text className="text-[#344054]">• Account Information: username, login credentials</Text>
                    <Text className="text-[#344054]">• Usage Data: interactions, preferences</Text>
                    <Text className="text-[#344054]">• Device Information: IP address, device type</Text>
                </View>

                <Text className="font-bold text-[#090E24] mb-2">3. HOW WE USE YOUR DATA</Text>
                <Text className="text-[#344054] mb-2">We use your data to:</Text>
                <View className="pl-2 mb-6">
                    <Text className="text-[#344054]">• Create and manage accounts</Text>
                    <Text className="text-[#344054]">• Improve user experience</Text>
                    <Text className="text-[#344054]">• Communicate updates</Text>
                    <Text className="text-[#344054]">• Ensure security and prevent fraud</Text>
                </View>

                <Text className="font-bold text-[#090E24] mb-2">4. DATA SHARING</Text>
                <Text className="text-[#344054] mb-2">We do not sell your data. We may share it with:</Text>
                <View className="pl-2 mb-6">
                    <Text className="text-[#344054]">• Service providers (cloud, analytics)</Text>
                    <Text className="text-[#344054]">• Legal authorities when required</Text>
                </View>

                <Text className="font-bold text-[#090E24] mb-2">5. USER RIGHTS</Text>
                <Text className="text-[#344054] mb-2">You have the right to:</Text>
                <View className="pl-2 mb-2">
                    <Text className="text-[#344054]">• Access your data</Text>
                    <Text className="text-[#344054]">• Correct inaccurate data</Text>
                    <Text className="text-[#344054]">• Request deletion</Text>
                    <Text className="text-[#344054]">• Withdraw consent</Text>
                </View>
                <Text className="text-[#344054] mb-6">Contact: support@jevahapp.com</Text>

                <Text className="font-bold text-[#090E24] mb-2">6. DATA SECURITY</Text>
                <Text className="text-[#344054] mb-2">We implement:</Text>
                <View className="pl-2 mb-6">
                    <Text className="text-[#344054]">• Encryption</Text>
                    <Text className="text-[#344054]">• Secure servers</Text>
                    <Text className="text-[#344054]">• Restricted access</Text>
                </View>

                <Text className="font-bold text-[#090E24] mb-2">7. DATA RETENTION</Text>
                <Text className="text-[#344054] mb-6">We retain data only as long as necessary for service and legal obligations.</Text>

                <Text className="font-bold text-[#090E24] mb-2">8. CHILDREN’S PRIVACY</Text>
                <Text className="text-[#344054] mb-6">We do not knowingly collect data from children under 13.</Text>

                <Text className="font-bold text-[#090E24] mb-2">9. CHANGES</Text>
                <Text className="text-[#344054] mb-6">We may update this policy. Continued use means acceptance.</Text>

                <Text className="font-bold text-[#090E24] mb-2">10. CONTACT</Text>
                <Text className="text-[#344054] mb-6">Email: support@jevahapp.com{"\n"}Location: Nigeria</Text>
            </ScrollView>
        </View>
    );
}
