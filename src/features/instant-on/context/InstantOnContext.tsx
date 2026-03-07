/**
 * InstantOnContext - Manages the 'Instant-On' video feed experience
 * 
 * This context synchronizes the splash screen visibility with the first video's
 * onReadyForDisplay event, ensuring users see Splash -> Live Video with no
 * thumbnails, loading spinners, or dark flashes.
 */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

interface InstantOnContextType {
  /** Whether the splash screen should remain visible */
  isSplashVisible: boolean;
  /** Whether the first video is ready for display */
  isFirstVideoReady: boolean;
  /** Mark the first video as ready and hide splash */
  markFirstVideoReady: () => void;
  /** Register a video as the first video in the feed */
  registerFirstVideo: (videoId: string) => void;
  /** Check if a video is the first video */
  isFirstVideo: (videoId: string) => boolean;
  /** Whether the initial data has been hydrated */
  isDataHydrated: boolean;
  /** Mark data as hydrated */
  markDataHydrated: () => void;
}

const InstantOnContext = createContext<InstantOnContextType | null>(null);

export const InstantOnProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isFirstVideoReady, setIsFirstVideoReady] = useState(false);
  const [isDataHydrated, setIsDataHydrated] = useState(false);
  const firstVideoIdRef = useRef<string | null>(null);
  const hasMarkedReadyRef = useRef(false);

  const registerFirstVideo = useCallback((videoId: string) => {
    if (!firstVideoIdRef.current) {
      firstVideoIdRef.current = videoId;
    }
  }, []);

  const isFirstVideo = useCallback((videoId: string) => {
    return firstVideoIdRef.current === videoId;
  }, []);

  const markFirstVideoReady = useCallback(() => {
    if (hasMarkedReadyRef.current) return;
    
    hasMarkedReadyRef.current = true;
    setIsFirstVideoReady(true);
    
    // Small delay to ensure smooth transition
    requestAnimationFrame(() => {
      setIsSplashVisible(false);
    });
  }, []);

  const markDataHydrated = useCallback(() => {
    setIsDataHydrated(true);
  }, []);

  return (
    <InstantOnContext.Provider
      value={{
        isSplashVisible,
        isFirstVideoReady,
        markFirstVideoReady,
        registerFirstVideo,
        isFirstVideo,
        isDataHydrated,
        markDataHydrated,
      }}
    >
      {children}
    </InstantOnContext.Provider>
  );
};

export const useInstantOn = (): InstantOnContextType => {
  const context = useContext(InstantOnContext);
  if (!context) {
    throw new Error('useInstantOn must be used within an InstantOnProvider');
  }
  return context;
};

export default InstantOnContext;
