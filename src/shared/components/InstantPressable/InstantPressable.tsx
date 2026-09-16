import React from "react";
import { Pressable, type PressableProps } from "react-native";

export type InstantPressableProps = PressableProps & {
  /**
   * Fire `onPress` on touch down. Use for chrome (tabs, FABs) — not icons
   * inside a scrolling list, where a drag would count as a tap.
   */
  pressOnTouchDown?: boolean;
};

/**
 * Zero-delay Pressable. Visual feedback starts immediately; the handler
 * still runs on `onPress` by default so scroll-vs-tap stays correct.
 */
export const InstantPressable = React.forwardRef<any, InstantPressableProps>(
  function InstantPressable(
    { onPress, onPressIn, pressOnTouchDown = false, children, ...rest },
    ref
  ) {
    return (
      <Pressable
        ref={ref}
        {...rest}
        unstable_pressDelay={0}
        android_disableSound
        onPress={pressOnTouchDown ? undefined : onPress}
        onPressIn={(event) => {
          onPressIn?.(event);
          if (pressOnTouchDown) onPress?.(event);
        }}
      >
        {children}
      </Pressable>
    );
  }
);

export default InstantPressable;
