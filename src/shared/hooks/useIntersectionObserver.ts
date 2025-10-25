import { useEffect, useRef, RefObject } from 'react';

interface IntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  onIntersect: () => void;
  onLeave?: () => void;
}

export const useIntersectionObserver = (
  ref: RefObject<Element>,
  options: IntersectionObserverOptions
) => {
  const { threshold = 0, rootMargin = '0px', onIntersect, onLeave } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onIntersect();
          } else if (onLeave) {
            onLeave();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [ref, threshold, rootMargin, onIntersect, onLeave]);

  return observerRef.current;
};
