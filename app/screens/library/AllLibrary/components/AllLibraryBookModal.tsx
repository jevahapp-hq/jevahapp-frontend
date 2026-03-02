/**
 * AllLibraryBookModal - Animated book details modal with Read/Close actions
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

interface AllLibraryBookModalProps {
  visible: boolean;
  selectedBook: any;
  bookAnimation: Animated.Value;
  onClose: () => void;
  onReadNow: (book: any) => void;
}

export function AllLibraryBookModal({
  visible,
  selectedBook,
  bookAnimation,
  onClose,
  onReadNow,
}: AllLibraryBookModalProps) {
  if (!visible || !selectedBook) return null;

  return (
    <View className="absolute inset-0 bg-black/50 z-50 justify-center items-center">
      <Animated.View
        style={{
          transform: [
            {
              scale: bookAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
            {
              rotateY: bookAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ["180deg", "0deg"],
              }),
            },
          ],
          opacity: bookAnimation,
        }}
        className="bg-white rounded-2xl p-6 mx-4 w-[90%] max-w-md"
      >
        <View className="items-center mb-4">
          <View className="w-32 h-40 bg-gradient-to-br from-[#8B4513] to-[#D2691E] rounded-lg shadow-lg justify-center items-center">
            <View className="bg-white/20 p-4 rounded-full">
              <Ionicons name="book" size={40} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View className="items-center mb-6">
          <Text className="text-xl font-rubik-bold text-center mb-2">
            {selectedBook.title}
          </Text>
          {selectedBook.speaker && (
            <Text className="text-gray-600 font-rubik text-center mb-2">
              by {selectedBook.speaker}
            </Text>
          )}
          <Text className="text-sm text-gray-500 font-rubik text-center">
            E-Book
          </Text>
        </View>

        <View className="flex-row justify-between space-x-3">
          <TouchableOpacity
            onPress={onClose}
            className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
          >
            <Text className="text-gray-700 font-rubik-bold">Close</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onReadNow(selectedBook)}
            className="flex-1 bg-[#FEA74E] py-3 rounded-lg items-center"
          >
            <Text className="text-white font-rubik-bold">Read Now</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}
