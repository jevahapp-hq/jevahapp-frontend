import { useState } from "react";
import { View } from "react-native";
import BibleOnboarding from "../components/BibleOnboarding";
import BibleReaderScreen from "../components/bible/BibleReaderScreen";

export default function BibleScreen() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleEnterBible = () => {
    setShowOnboarding(false);
  };

  const handleBackToOnboarding = () => {
    setShowOnboarding(true);
  };

  // Show onboarding screen first
  if (showOnboarding) {
    return <BibleOnboarding onEnterBible={handleEnterBible} />;
  }

  // Show the main Bible reader
  return (
    <View style={{ flex: 1 }}>
      <BibleReaderScreen onBack={handleBackToOnboarding} />
    </View>
  );
}
