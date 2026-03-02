// Analytics utility for tracking user interactions
// This is a placeholder implementation - replace with your actual analytics service

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp?: string;
}

class AnalyticsService {
  private isEnabled: boolean = true;
  private events: AnalyticsEvent[] = [];

  // Track an event
  track(event: string, properties: Record<string, any> = {}) {
    if (!this.isEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        userId: this.getUserId(),
        deviceInfo: this.getDeviceInfo(),
      },
    };

    this.events.push(analyticsEvent);

    // Always log to console for debugging and backend feeding
    console.log("📊 ANALYTICS EVENT:", JSON.stringify(analyticsEvent, null, 2));

    // Send to your analytics service
    this.sendToAnalytics(analyticsEvent);
  }

  // Send event to analytics service
  private async sendToAnalytics(event: AnalyticsEvent) {
    try {
      // Replace with your actual analytics service (Firebase, Mixpanel, etc.)
      // Example for Firebase Analytics:
      // await firebase.analytics().logEvent(event.event, event.properties);

      // Example for Mixpanel:
      // mixpanel.track(event.event, event.properties);

      // For now, just log to console
      console.log("📈 Sending to analytics:", event);
    } catch (error) {
      console.warn("Failed to send analytics event:", error);
    }
  }

  // Set user properties
  setUserProperties(properties: Record<string, any>) {
    if (!this.isEnabled) return;

    try {
      // Replace with your actual analytics service
      // Example for Firebase Analytics:
      // Object.entries(properties).forEach(([key, value]) => {
      //   firebase.analytics().setUserProperty(key, String(value));
      // });

      console.log("👤 Setting user properties:", properties);
    } catch (error) {
      console.warn("Failed to set user properties:", error);
    }
  }

  // Set user ID
  setUserId(userId: string) {
    if (!this.isEnabled) return;

    try {
      // Replace with your actual analytics service
      // Example for Firebase Analytics:
      // firebase.analytics().setUserId(userId);

      console.log("🆔 Setting user ID:", userId);
    } catch (error) {
      console.warn("Failed to set user ID:", error);
    }
  }

  // Enable/disable analytics
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Get all tracked events (for debugging)
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  // Clear events (for testing)
  clearEvents() {
    this.events = [];
  }

  // Get session ID (unique per app session)
  private getSessionId(): string {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }
    return this.sessionId;
  }

  // Get user ID from token or storage
  private getUserId(): string | null {
    try {
      // Try to get user ID from token or storage
      // This would need to be implemented based on your auth system
      return null; // Placeholder
    } catch {
      return null;
    }
  }

  // Get device information
  private getDeviceInfo() {
    return {
      platform: "react-native",
      appVersion: "1.0.0", // Replace with actual version
      timestamp: new Date().toISOString(),
    };
  }

  private sessionId: string | null = null;
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export individual functions for convenience
export const trackEvent = (
  event: string,
  properties: Record<string, any> = {}
) => {
  analytics.track(event, properties);
};

export const setUserProperties = (properties: Record<string, any>) => {
  analytics.setUserProperties(properties);
};

export const setUserId = (userId: string) => {
  analytics.setUserId(userId);
};

export default analytics;
