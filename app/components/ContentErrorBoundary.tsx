import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ContentErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ContentErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<{ error?: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ContentErrorBoundary extends React.Component<
  ContentErrorBoundaryProps,
  ContentErrorBoundaryState
> {
  constructor(props: ContentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ContentErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ContentErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            backgroundColor: '#F8F9FA',
            minHeight: 200,
          }}
        >
          <Ionicons name="warning-outline" size={48} color="#FEA74E" />
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#1D2939',
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            Content Loading Error
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#6B7280',
              marginTop: 8,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            There was a problem loading this content. Please try again.
          </Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            style={{
              backgroundColor: '#FEA74E',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              marginTop: 16,
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useContentErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Content error captured:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};
