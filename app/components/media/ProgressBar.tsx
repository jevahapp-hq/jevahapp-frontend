import { View } from "react-native";

type ProgressBarProps = {
  progress: number; // 0-1 or 0-100 depending on asPercent
  asPercent?: boolean;
};

export default function ProgressBar({
  progress,
  asPercent = true,
}: ProgressBarProps) {
  const width = asPercent
    ? `${progress}%`
    : `${Math.max(0, Math.min(1, progress)) * 100}%`;
  return (
    <View className="h-1 bg-white/30 rounded-full">
      <View className="h-full bg-[#FEA74E] rounded-full" style={{ width }} />
    </View>
  );
}

