import { AllContentTikTok as ModularAllContentTikTok } from "@/src/features/media/AllContentTikTok";
import type { ContentType } from "@/src/shared/types";

type Props = {
  contentType?: "ALL" | ContentType;
};

export default function AllContentTikTokWrapper({
  contentType = "ALL",
}: Props) {
  return <ModularAllContentTikTok contentType={contentType} />;
}
