import { ScrollView, Text, View } from "react-native";

import AuthHeader from "../components/AuthHeader";

export default function TermsOfServiceScreen() {
    return (
        <View className="flex-1 bg-white">
            <View className="px-4 mt-6">
                <AuthHeader title="Terms of Service" />
            </View>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                <Text className="text-sm text-gray-500 mb-6">Last Updated: 23rd March 2026</Text>

                <Text className="font-bold text-[#090E24] mb-2">1. ACCEPTANCE OF TERMS</Text>
                <Text className="text-[#344054] mb-6">By using Jevah App, you agree to these Terms.</Text>

                <Text className="font-bold text-[#090E24] mb-2">2. USER ACCOUNTS</Text>
                <View className="pl-2 mb-6 text-[#344054]">
                    <Text className="text-[#344054]">• Provide accurate information</Text>
                    <Text className="text-[#344054]">• Keep login details secure</Text>
                    <Text className="text-[#344054]">• You are responsible for your account activity</Text>
                </View>

                <Text className="font-bold text-[#090E24] mb-2">3. USER CONDUCT</Text>
                <Text className="text-[#344054] mb-2">You agree NOT to:</Text>
                <View className="pl-2 mb-6 text-[#344054]">
                    <Text className="text-[#344054]">• Upload copyrighted content without permission</Text>
                    <Text className="text-[#344054]">• Post illegal, harmful, or misleading content</Text>
                    <Text className="text-[#344054]">• Violate any applicable laws</Text>
                </View>

                <Text className="font-bold text-[#090E24] mb-2">4. USER CONTENT</Text>
                <Text className="text-[#344054] mb-6">You retain ownership of your content but grant Jevah a license to use, display, and distribute it within the app.{"\n"}You are solely responsible for your content.</Text>

                <Text className="font-bold text-[#090E24] mb-2">5. CONTENT MODERATION</Text>
                <Text className="text-[#344054] mb-2">We may:</Text>
                <View className="pl-2 mb-6 text-[#344054]">
                    <Text className="text-[#344054]">• Remove content</Text>
                    <Text className="text-[#344054]">• Suspend or terminate accounts</Text>
                    <Text className="text-[#344054]">• Act on user reports</Text>
                </View>

                <Text className="font-bold text-[#090E24] mb-2">6. LIMITATION OF LIABILITY</Text>
                <Text className="text-[#344054] mb-2">Jevah is not liable for:</Text>
                <View className="pl-2 mb-2 text-[#344054]">
                    <Text className="text-[#344054]">• User-generated content</Text>
                    <Text className="text-[#344054]">• Loss or damage from app usage</Text>
                </View>
                <Text className="text-[#344054] mb-6">You agree to indemnify Jevah against claims arising from your actions.</Text>

                <Text className="font-bold text-[#090E24] mb-2">7. TERMINATION</Text>
                <Text className="text-[#344054] mb-6">We may suspend or terminate accounts for violations.</Text>

                <Text className="font-bold text-[#090E24] mb-2">8. DISCLAIMER</Text>
                <Text className="text-[#344054] mb-6">The app is provided “as is” without warranties.</Text>

                <Text className="font-bold text-[#090E24] mb-2">9. GOVERNING LAW</Text>
                <Text className="text-[#344054] mb-6">These Terms are governed by Nigerian law.</Text>

                <Text className="font-bold text-[#090E24] mb-2">10. CHANGES</Text>
                <Text className="text-[#344054] mb-6">We may update these Terms at any time.</Text>

                <Text className="font-bold text-[#090E24] mb-2">11. CONTACT</Text>
                <Text className="text-[#344054] mb-6">Email: support@jevahapp.com</Text>
            </ScrollView>
        </View>
    );
}
