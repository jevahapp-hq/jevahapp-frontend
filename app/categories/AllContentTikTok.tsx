import { AllContentTikTok as ModularAllContentTikTok } from "@/src/features/media/AllContentTikTok";
import type { ContentType } from "@/src/shared/types";

type Props = {
  contentType?: "ALL" | ContentType;
  useAuthFeed?: boolean;
};

export default function AllContentTikTokWrapper({
  contentType = "ALL",
  useAuthFeed = false,
}: Props) {
  return (
    <ModularAllContentTikTok
      contentType={contentType}
      useAuthFeed={useAuthFeed}
    />
  );
}
