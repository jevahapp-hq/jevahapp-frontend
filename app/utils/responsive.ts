export const createSafeVideoSource = (uri?: string | null, fallback = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4') => {
  if (!uri || uri.trim() === '' || uri === 'https://example.com/placeholder.mp4') {
    return { uri: fallback };
  }
  return { uri: uri.trim() };
};
