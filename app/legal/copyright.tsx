import { ScrollView, Text, View } from "react-native";

import AuthHeader from "../components/AuthHeader";

export default function CopyrightPolicyScreen() {
    return (
        <View className="flex-1 bg-white">
            <View className="px-4 mt-6">
                <AuthHeader title="Copyright Policy" />
            </View>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                <Text className="text-sm text-gray-500 mb-6">Last Updated: 23rd March 2026</Text>

                <Text className="font-bold text-[#090E24] mb-2">1. INTRODUCTION</Text>
                <Text className="text-[#344054] mb-6">Jevah respects intellectual property rights and expects users to do the same.</Text>

                <Text className="font-bold text-[#090E24] mb-2">2. USER RESPONSIBILITY</Text>
                <Text className="text-[#344054] mb-2">Users must only upload content they:</Text>
                <View className="pl-2 mb-6">
                    <Text className="text-[#344054]">• Own</Text>
                    <Text className="text-[#344054]">• Have permission to use</Text>
                </View>

                <Text className="font-bold text-[#090E24] mb-2">3. REPORTING COPYRIGHT INFRINGEMENT</Text>
                <Text className="text-[#344054] mb-2">If you believe your copyright is being infringed, submit a report with:</Text>
                <View className="pl-2 mb-2">
                    <Text className="text-[#344054]">• Your name and contact details</Text>
                    <Text className="text-[#344054]">• Description of the copyrighted work</Text>
                    <Text className="text-[#344054]">• Link to the infringing content</Text>
                    <Text className="text-[#344054]">• A good faith statement</Text>
                </View>
                <Text className="text-[#344054] mb-6">Send to: support@jevahapp.com</Text>

                <Text className="font-bold text-[#090E24] mb-2">4. TAKEDOWN PROCESS</Text>
                <Text className="text-[#344054] mb-2">Upon receiving a valid complaint, we will:</Text>
                <View className="pl-2 mb-6">
                    <Text className="text-[#344054]">• Investigate the report</Text>
                    <Text className="text-[#344054]">• Remove or restrict access to the content</Text>
                    <Text className="text-[#344054]">• Notify the user (where applicable)</Text>
                </View>

                <Text className="font-bold text-[#090E24] mb-2">5. REPEAT INFRINGERS</Text>
                <Text className="text-[#344054] mb-2">Users who repeatedly violate copyright may:</Text>
                <View className="pl-2 mb-6">
                    <Text className="text-[#344054]">• Have content removed</Text>
                    <Text className="text-[#344054]">• Have accounts suspended or terminated</Text>
                </View>

                <Text className="font-bold text-[#090E24] mb-2">6. FALSE CLAIMS</Text>
                <Text className="text-[#344054] mb-6">Submitting false claims may result in account action.</Text>

                <Text className="font-bold text-[#090E24] mb-2">7. POLICY UPDATES</Text>
                <Text className="text-[#344054] mb-6">We may update this policy at any time.</Text>

                <Text className="font-bold text-[#090E24] mb-2">8. CONTACT</Text>
                <Text className="text-[#344054] mb-6">Email: support@jevahapp.com</Text>
            </ScrollView>
        </View>
    );
}
