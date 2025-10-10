import { ReactNode } from "react";
import { ScrollView, View } from "react-native";

type ScreenLayoutProps = {
  header?: ReactNode;
  children: ReactNode;
  withScroll?: boolean;
  contentPaddingBottom?: number;
};

export default function ScreenLayout({
  header,
  children,
  withScroll = true,
  contentPaddingBottom = 50,
}: ScreenLayoutProps) {
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {header}
      {withScroll ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: contentPaddingBottom,
          }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </View>
  );
}

