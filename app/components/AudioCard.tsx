import UnifiedMediaControls from "./UnifiedMediaControls";

type AudioCardProps = {
  content: {
    _id: string;
    title: string;
    contentType: string;
    fileUrl: string;
    thumbnailUrl?: string;
    duration?: number;
  };
  className?: string;
};

export default function AudioCard({ content, className = "" }: AudioCardProps) {
  return <UnifiedMediaControls content={content} className={className} />;
}


