/**
 * App typeface. On Android, set `fontFamily` only — never pair a custom
 * family with `fontWeight` or the system font wins.
 */
export const Fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

export const font = {
  regular: { fontFamily: Fonts.regular } as const,
  medium: { fontFamily: Fonts.medium } as const,
  semibold: { fontFamily: Fonts.semibold } as const,
  bold: { fontFamily: Fonts.bold } as const,
  extrabold: { fontFamily: Fonts.extrabold } as const,
};
