import { useState } from 'react';
import ServerUnavailableModal from './ServerUnavailableModal';

interface ServerUnavailableModalWrapperProps {
  // Optional props for customization
  autoShow?: boolean;
  errorMessage?: string;
}

export default function ServerUnavailableModalWrapper({
  autoShow = false,
  errorMessage = "Unable to connect to server"
}: ServerUnavailableModalWrapperProps) {
  const [visible, setVisible] = useState(autoShow);

  const handleRetry = () => {
    // You can add retry logic here
    console.log('Retrying connection...');
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  // For now, we'll keep the modal hidden by default
  // In a real implementation, you might want to show it based on network status
  // or API errors from a global state management system

  return (
    <ServerUnavailableModal
      visible={visible}
      onRetry={handleRetry}
      onDismiss={handleDismiss}
      errorMessage={errorMessage}
    />
  );
}

