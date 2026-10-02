import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { mmkvGetJson, mmkvSetJson } from "../../src/shared/cache/mmkvStorage";

export type BibleFontId = "classic" | "clean" | "modern";

const KEY = "bible-reading-style";
const SIZES = [16, 18, 20, 23, 27];

type Style = { fontId: BibleFontId; sizeIndex: number };

const listeners = new Set<() => void>();

function load(): Style {
  const saved = mmkvGetJson<Partial<Style>>(KEY);
  const fontId =
    saved?.fontId === "clean" || saved?.fontId === "modern"
      ? saved.fontId
      : "classic";
  const sizeIndex =
    typeof saved?.sizeIndex === "number"
      ? Math.max(0, Math.min(SIZES.length - 1, saved.sizeIndex))
      : 1;
  return { fontId, sizeIndex };
}

let style = load();

function commit(next: Style) {
  style = next;
  mmkvSetJson(KEY, next);
  listeners.forEach((listener) => listener());
}

export function bibleFontFamily(id: BibleFontId): string {
  if (id === "clean") return "Rubik_400Regular";
  if (id === "modern") return "PlusJakartaSans_400Regular";
  return Platform.OS === "android" ? "serif" : "Georgia";
}

export const BIBLE_FONT_CHOICES: { id: BibleFontId; name: string }[] = [
  { id: "classic", name: "Classic" },
  { id: "clean", name: "Clean" },
  { id: "modern", name: "Modern" },
];

export function useBibleReadingStyle() {
  const [value, setValue] = useState(style);
  useEffect(() => {
    const listener = () => setValue({ ...style });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return {
    fontId: value.fontId,
    fontFamily: bibleFontFamily(value.fontId),
    fontSize: SIZES[value.sizeIndex],
    lineHeight: Math.round(SIZES[value.sizeIndex] * 1.55),
    canSmaller: value.sizeIndex > 0,
    canLarger: value.sizeIndex < SIZES.length - 1,
    setFont: (fontId: BibleFontId) => commit({ ...style, fontId }),
    smaller: () =>
      commit({ ...style, sizeIndex: Math.max(0, style.sizeIndex - 1) }),
    larger: () =>
      commit({
        ...style,
        sizeIndex: Math.min(SIZES.length - 1, style.sizeIndex + 1),
      }),
  };
}
