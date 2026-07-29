/**
 * Shared MediaCard shell — layout only (media slot + footer + modals).
 */
import React from "react";
import { View, type LayoutChangeEvent } from "react-native";

export function MediaCardShell(props: {
  children: React.ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Used by feed focus loop (measureInWindow) */
  focusRef?: (node: View | null) => void;
  className?: string;
  style?: object;
}) {
  const {
    children,
    onLayout,
    focusRef,
    className = "flex flex-col mb-16",
    style = { marginBottom: 64 },
  } = props;

  return (
    <View
      ref={focusRef}
      className={className}
      style={style}
      onLayout={onLayout}
      collapsable={false}
    >
      {children}
    </View>
  );
}
