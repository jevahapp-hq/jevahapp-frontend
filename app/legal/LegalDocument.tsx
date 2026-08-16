import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

import AuthHeader from "../components/AuthHeader";

export function LegalScreen({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <View className="flex-1 bg-white">
      <View className="px-4 mt-6">
        <AuthHeader title={title} />
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <Text className="text-sm text-gray-500 mb-2">Last updated: {updated}</Text>
        <Text className="text-xs text-gray-400 mb-6">
          Please read this document carefully. It forms part of your agreement
          with Jevah.
        </Text>
        {children}
      </ScrollView>
    </View>
  );
}

export function H({ children }: { children: ReactNode }) {
  return (
    <Text className="font-bold text-[#090E24] text-[15px] mb-2 mt-1">
      {children}
    </Text>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <Text className="text-[#344054] text-[14px] leading-5 mb-4">
      {children}
    </Text>
  );
}

export function Ul({ items }: { items: string[] }) {
  return (
    <View className="pl-1 mb-4">
      {items.map((item) => (
        <Text
          key={item}
          className="text-[#344054] text-[14px] leading-5 mb-1.5"
        >
          • {item}
        </Text>
      ))}
    </View>
  );
}
