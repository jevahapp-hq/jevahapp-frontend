import React from "react";
import { Pressable, type PressableProps } from "react-native";

export type InstantPressableProps = PressableProps & {
  /**
   * Fire `onPress` on touch down. Buttons and icons do this so the action
   * happens as the finger lands. Hold gestures keep the release path.
   */
  pressOnTouchDown?: boolean;
};

/**
 * Zero-delay Pressable. The handler runs on touch-down so a tap feels like
 * a click on Android and iOS. A button that also has `onLongPress` still
 * waits for release, so a hold is not also a tap.
 */
export const InstantPressable = React.forwardRef<any, InstantPressableProps>(
  function InstantPressable(
    { onPress, onPressIn, onLongPress, pressOnTouchDown = true, disabled, children, ...rest },
    ref
  ) {
    const fireOnTouchDown = pressOnTouchDown && !onLongPress && !disabled;
    return (
      <Pressable
        ref={ref}
        {...rest}
        disabled={disabled}
        onLongPress={onLongPress}
        unstable_pressDelay={0}
        android_disableSound
        onPress={fireOnTouchDown ? undefined : onPress}
        onPressIn={(event) => {
          onPressIn?.(event);
          if (fireOnTouchDown) onPress?.(event);
        }}
      >
        {children}
      </Pressable>
    );
  }
);

export default InstantPressable;
