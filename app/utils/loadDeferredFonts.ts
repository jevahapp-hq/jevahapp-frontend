/**
 * Rubik + Poppins are Bible / secondary chrome. Keep them off the Home
 * critical path so Expo Go does not download 8 extra font files first.
 */
let started = false;

export async function loadDeferredFonts(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const [{ default: Font }, rubik, poppins] = await Promise.all([
      import("expo-font"),
      import("@expo-google-fonts/rubik"),
      import("@expo-google-fonts/poppins"),
    ]);
    await Font.loadAsync({
      Rubik_400Regular: rubik.Rubik_400Regular,
      Rubik_500Medium: rubik.Rubik_500Medium,
      Rubik_600SemiBold: rubik.Rubik_600SemiBold,
      Rubik_700Bold: rubik.Rubik_700Bold,
      Rubik: rubik.Rubik_400Regular,
      "Rubik-Regular": rubik.Rubik_400Regular,
      "Rubik-Medium": rubik.Rubik_500Medium,
      "Rubik-SemiBold": rubik.Rubik_600SemiBold,
      "Rubik-Bold": rubik.Rubik_700Bold,
      Poppins_400Regular: poppins.Poppins_400Regular,
      Poppins_500Medium: poppins.Poppins_500Medium,
      Poppins_600SemiBold: poppins.Poppins_600SemiBold,
      Poppins_700Bold: poppins.Poppins_700Bold,
      Poppins: poppins.Poppins_400Regular,
      "Poppins-Regular": poppins.Poppins_400Regular,
      "Poppins-Medium": poppins.Poppins_500Medium,
      "Poppins-SemiBold": poppins.Poppins_600SemiBold,
      "Poppins-Bold": poppins.Poppins_700Bold,
    });
  } catch {
    started = false;
  }
}
