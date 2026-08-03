import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import type { DisplayMode } from "../types";
import { DisplayModeToggle } from "./DisplayModeToggle";

type MusicHeaderProps = {
  showSearchInput: boolean;
  searchQuery: string;
  displayMode: DisplayMode;
  onShowSearch: () => void;
  onHideSearch: () => void;
  onSearchChange: (query: string) => void;
  onOpenFilter: () => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
};

/** Header with Search and Display Mode Toggle */
export function MusicHeader({
  showSearchInput,
  searchQuery,
  displayMode,
  onShowSearch,
  onHideSearch,
  onSearchChange,
  onOpenFilter,
  onDisplayModeChange,
}: MusicHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
      }}
    >
      {/* Search Input or Icon */}
      {showSearchInput ? (
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F3F4F6",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="search" size={20} color="#98A2B3" />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 16,
              fontFamily: "Rubik_400Regular",
              color: "#1D2939",
            }}
            placeholder="Search songs..."
            placeholderTextColor="#98A2B3"
            value={searchQuery}
            onChangeText={onSearchChange}
            autoFocus
          />
          <TouchableOpacity
            onPress={() => {
              onSearchChange("");
              onHideSearch();
            }}
            style={{ marginLeft: 8 }}
          >
            <Text
              style={{
                color: "#256E63",
                fontFamily: "Rubik_600SemiBold",
                fontSize: 14,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={onShowSearch}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#F3F4F6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="search" size={20} color="#256E63" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenFilter}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#F3F4F6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="filter" size={20} color="#256E63" />
          </TouchableOpacity>

          {/* Display Mode Toggle (kept alongside icons; centered as a group) */}
          <DisplayModeToggle
            displayMode={displayMode}
            onChange={onDisplayModeChange}
          />
        </View>
      )}
    </View>
  );
}
