import React, { useMemo } from "react";
import { View, FlatList, Text } from "react-native";
import { useMediaStore } from "../store/useUploadStore";

export default function FilteredMediaList({ tag }: { tag: string }) {
  const mediaList = useMediaStore((state) => state.mediaList);

  // ✅ useMemo ensures filtering doesn't cause infinite re-renders
  const filteredMedia = useMemo(() => {
    return mediaList.filter(
      (item) => Array.isArray(item.category) && item.category.includes(tag)
    );
  }, [mediaList, tag]);

  return (
    <View style={{ padding: 16 }}>
      <FlatList
        data={filteredMedia}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
            <Text>{item.description}</Text>
          </View>
        )}
      />
    </View>
  );
}
