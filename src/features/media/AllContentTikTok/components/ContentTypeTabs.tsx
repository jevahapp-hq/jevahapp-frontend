import React, { useEffect, useRef } from "react";
import {
    Dimensions,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import {
    getResponsiveBorderRadius,
    getResponsiveShadow,
    getResponsiveSpacing,
    getResponsiveTextStyle,
} from "../../../../../utils/responsive";
import { ContentType } from "../../../../shared/types";

interface ContentTypeTabsProps {
    activeTab: ContentType | "ALL";
    onTabChange: (tab: ContentType | "ALL") => void;
}

const TABS: { label: string; value: ContentType | "ALL" }[] = [
    { label: "ALL", value: "ALL" },
    { label: "VIDEO", value: "video" },
    { label: "SERMON", value: "sermon" },
    { label: "TEACHINGS", value: "teachings" },
    { label: "MUSIC", value: "music" },
];

export const ContentTypeTabs: React.FC<ContentTypeTabsProps> = ({
    activeTab,
    onTabChange,
}) => {
    const scrollViewRef = useRef<ScrollView>(null);
    const buttonLayouts = useRef<{ [key: string]: { x: number; width: number } }>({});

    // Scroll to selected category button when category changes
    useEffect(() => {
        if (activeTab && scrollViewRef.current) {
            setTimeout(() => {
                const selectedIndex = TABS.findIndex(t => t.value === activeTab);
                if (selectedIndex !== -1 && scrollViewRef.current) {
                    const scrollView = scrollViewRef.current;
                    const screenWidth = Dimensions.get('window').width;
                    const parentPadding = getResponsiveSpacing(16, 20, 24, 32);
                    const scrollViewWidth = screenWidth - parentPadding * 2;

                    if (buttonLayouts.current[activeTab]) {
                        const buttonLayout = buttonLayouts.current[activeTab];
                        const buttonCenter = buttonLayout.x + (buttonLayout.width / 2);
                        const viewportCenter = scrollViewWidth / 2;
                        const scrollPosition = buttonCenter - viewportCenter;

                        scrollView.scrollTo({
                            x: Math.max(0, scrollPosition),
                            animated: true,
                        });
                    }
                }
            }, 200);
        }
    }, [activeTab]);

    return (
        <View
            style={{
                paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
                backgroundColor: "#FCFCFD",
            }}
        >
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{
                    paddingVertical: getResponsiveSpacing(12, 16, 20, 24),
                    marginTop: getResponsiveSpacing(20, 24, 28, 32),
                }}
            >
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.value}
                        onPress={() => onTabChange(tab.value)}
                        onLayout={(event) => {
                            const { x, width } = event.nativeEvent.layout;
                            buttonLayouts.current[tab.value] = { x, width };
                        }}
                        activeOpacity={0.7}
                        style={{
                            paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                            paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                            marginHorizontal: getResponsiveSpacing(4, 6, 8, 10),
                            borderRadius: getResponsiveBorderRadius("medium"),
                            backgroundColor: activeTab === tab.value ? "black" : "white",
                            borderWidth: activeTab === tab.value ? 0 : 1,
                            borderColor: activeTab === tab.value ? "transparent" : "#6B6E7C",
                            ...getResponsiveShadow(),
                            minWidth: 48,
                            minHeight: 44,
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <View style={{ position: "relative" }}>
                            <Text
                                style={[
                                    getResponsiveTextStyle("button"),
                                    {
                                        color: activeTab === tab.value ? "white" : "#1D2939",
                                    },
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};
