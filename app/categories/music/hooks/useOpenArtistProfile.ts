import { useCallback } from "react";
import { useRouter } from "expo-router";

export function useOpenArtistProfile() {
  const router = useRouter();

  const openArtistProfile = useCallback(
    (slug?: string) => {
      if (!slug) return;
      router.push({
        pathname: "/artists/[slug]",
        params: { slug },
      });
    },
    [router]
  );

  return openArtistProfile;
}
