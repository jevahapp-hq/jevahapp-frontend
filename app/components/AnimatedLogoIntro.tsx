import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutRectangle, View } from 'react-native';
import Animated, {
    Easing,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import SmileSvg from '../../assets/images/The smile 1.svg';
import SunSvg from '../../assets/images/The sun 1 (1).svg';

type AnimatedLogoIntroProps = {
  /** Called when all animations finish */
  onFinished?: () => void;
  /** Background color to fade into */
  backgroundColor?: string;
  /** Size multiplier for the whole logo */
  scale?: number;
  /** Stagger in ms between letters (default 100ms to fit ~2s total) */
  letterStaggerMs?: number;
};

const DEFAULT_BG = '#0A332D'; // deep green
const TEXT_COLOR = '#F3EAD7'; // warm cream
const ACCENT_ORANGE = '#F4A53A';

const LETTERS = ['J', 'e', 'v', 'a', 'h'];

type LetterProps = {
  letter: string;
  index: number;
  scale: number;
  letterStaggerMs: number;
  onMeasure?: (index: number, layout: LayoutRectangle) => void;
};

const Letter: React.FC<LetterProps> = ({ letter, index, scale, letterStaggerMs, onMeasure }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    const LETTER_IN_DURATION = 200; // ms
    progress.value = withDelay(
      200 + index * letterStaggerMs,
      withTiming(1, { duration: LETTER_IN_DURATION, easing: Easing.out(Easing.cubic) })
    );
  }, [index, letterStaggerMs, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      transform: [{ translateX: (1 - p) * 40 }],
    };
  });

  return (
    <Animated.Text
      style={[
        { color: TEXT_COLOR, fontSize: 64 * scale, fontWeight: '800', lineHeight: 70 * scale },
        style,
      ]}
      onLayout={(e) => onMeasure?.(index, e.nativeEvent.layout)}
    >
      {letter}
    </Animated.Text>
  );
};

export default function AnimatedLogoIntro({
  onFinished,
  backgroundColor = DEFAULT_BG,
  scale = 1,
  letterStaggerMs = 100,
}: AnimatedLogoIntroProps) {
  // Background fade-in
  const bgProgress = useSharedValue(0);

  // Sun and smile progress
  const sunProgress = useSharedValue(0);
  const smileProgress = useSharedValue(0);

  const bgStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        bgProgress.value,
        [0, 1],
        ['rgba(0,0,0,0)', backgroundColor]
      ),
      transform: [{ scale }],
    };
  }, [backgroundColor, scale]);

  // Keep latest onFinished without retriggering the animation effect
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const LETTER_IN_DURATION = 200; // ms
    const SUN_DROP_DURATION = 1200; // ms
    const SMILE_SLIDE_DURATION = 1200; // ms

    // 1) Fade in background
    bgProgress.value = 0;
    sunProgress.value = 0;
    smileProgress.value = 0;
    bgProgress.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });

    // 3) Sun drops after the last letter completes
    const afterLettersDelay = 200 + (LETTERS.length - 1) * letterStaggerMs + LETTER_IN_DURATION;
    // 3) Sun drops and smile slides at the same time
    sunProgress.value = withDelay(
      afterLettersDelay,
      withTiming(1, { duration: SUN_DROP_DURATION, easing: Easing.out(Easing.cubic) })
    );
    smileProgress.value = withDelay(
      afterLettersDelay,
      withTiming(
        1,
        { duration: SMILE_SLIDE_DURATION, easing: Easing.out(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished && onFinishedRef.current) {
            runOnJS(onFinishedRef.current)();
          }
        }
      )
    );

    // Cleanup function to cancel animations if component unmounts
    return () => {
      bgProgress.value = 0;
      sunProgress.value = 0;
      smileProgress.value = 0;
    };
  }, [letterStaggerMs, bgProgress, sunProgress, smileProgress]);

  // Sun drop animation (from above the word)
  const sunStyle = useAnimatedStyle(() => {
    const p = sunProgress.value;
    return {
      opacity: p,
      transform: [{ translateY: (1 - p) * -40 }],
    };
  });

  // Smile slide-up animation (from below)
  const smileStyle = useAnimatedStyle(() => {
    const p = smileProgress.value;
    return {
      opacity: p,
      transform: [{ translateY: (1 - p) * 40 }],
    };
  });

  // Track measured positions of each letter to position sun/smile precisely
  const [letterLayouts, setLetterLayouts] = useState<Array<LayoutRectangle | null>>(
    Array.from({ length: LETTERS.length }, () => null)
  );

  const handleMeasureLetter = (i: number, layout: LayoutRectangle) => {
    setLetterLayouts((prev) => {
      const next = [...prev];
      next[i] = layout;
      return next;
    });
  };

  const geometry = useMemo(() => {
    const v = letterLayouts[2];
    const a = letterLayouts[3];
    const j = letterLayouts[0];
    const h = letterLayouts[4];

    let sunLeft: number | undefined;
    let sunWidth: number | undefined;
    let sunHeight: number | undefined;
    let sunTop: number | undefined;

    let smileLeft: number | undefined;
    let smileWidth: number | undefined;
    let smileHeight: number | undefined;
    let smileTop: number | undefined;

    const measured = letterLayouts.filter((x): x is LayoutRectangle => !!x);
    const lettersTop = measured.length ? Math.min(...measured.map((x) => x.y)) : undefined;
    const lettersBottom = measured.length ? Math.max(...measured.map((x) => x.y + x.height)) : undefined;

    const TOUCH_GAP = 0 * scale; // no gap: directly touching

    if (v && a) {
      const vRight = v.x + v.width; // approximate second leg/right edge of 'v'
      sunLeft = vRight; // start right after 'v'
      sunWidth = a.width; // span full width of 'a'
      sunHeight = (40 / 64) * sunWidth; // keep aspect ratio
      if (lettersTop !== undefined) {
        sunTop = lettersTop - TOUCH_GAP - (sunHeight ?? 0); // sit just above letters
      }
    }

    if (j && h) {
      const jMid = j.x + j.width / 2; // middle of 'J'
      const hRight = h.x + h.width;   // right edge of 'h'
      const width = Math.max(0, hRight - jMid);
      smileLeft = jMid;
      smileWidth = width;
      smileHeight = (70 / 260) * width; // keep aspect ratio
      if (lettersBottom !== undefined) {
        smileTop = lettersBottom + TOUCH_GAP; // sit just below letters
      }
    }

    return { sunLeft, sunWidth, sunHeight, sunTop, smileLeft, smileWidth, smileHeight, smileTop };
  }, [letterLayouts, scale]);

  return (
    <Animated.View
      className="flex-1 items-center justify-center"
      style={bgStyle}
    >
      <View className="items-center justify-center" style={{ overflow: 'visible' }}>
        {/* Wordmark area (relative container) */}
        <View style={{ position: 'relative' }}>
          <View className="flex-row items-end">
          {LETTERS.map((ltr, i) => (
            <Letter
              key={`${ltr}-${i}`}
              letter={ltr}
              index={i}
              scale={scale}
              letterStaggerMs={letterStaggerMs}
                onMeasure={handleMeasureLetter}
            />
          ))}
          </View>

          {/* Sun: from right edge of 'v' spanning full width of 'a' */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: geometry.sunTop ?? -30 * scale,
                zIndex: 2,
                left: geometry.sunLeft ?? undefined,
                width: geometry.sunWidth ?? 64 * scale,
                height: geometry.sunHeight ?? 40 * scale,
              },
              !geometry.sunLeft && { left: 0, right: 0, alignItems: 'center' },
              sunStyle,
            ]}
          >
            <SunSvg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
          </Animated.View>

          {/* Smile: from mid of 'J' to right edge of 'h' */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: geometry.smileTop ?? 0,
                zIndex: 1,
                left: geometry.smileLeft ?? undefined,
                width: geometry.smileWidth ?? 260 * scale,
                height: geometry.smileHeight ?? 70 * scale,
              },
              !geometry.smileLeft && { left: 0, right: 0, alignItems: 'center' },
              smileStyle,
            ]}
          >
            <SmileSvg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}


