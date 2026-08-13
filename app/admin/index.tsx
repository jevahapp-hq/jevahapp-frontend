/**
 * Admin console hub
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LINKS = [
  {
    title: "Reports",
    subtitle: "Inspect media & moderation decisions",
    href: "/admin/reports",
    icon: "flag-outline" as const,
  },
  {
    title: "Releases",
    subtitle: "Artist release catalog",
    href: "/admin/releases",
    icon: "albums-outline" as const,
  },
];

export default function AdminHubScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 4, marginRight: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#111" }}>
          Admin
        </Text>
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {LINKS.map((link) => (
          <TouchableOpacity
            key={link.href}
            onPress={() => router.push(link.href as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              backgroundColor: "#FAFAFA",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#0A332D",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name={link.icon} size={22} color="#FEA74E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 16, color: "#111" }}>
                {link.title}
              </Text>
              <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 2 }}>
                {link.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
