/**
 * The Create (+) button is the Upload / Go Live sheet. It stays off the
 * ebook feed and the reader, where those actions do not apply.
 */
const listeners = new Set<() => void>();
let ebookFeedActive = false;

function emit(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // no-op
    }
  });
}

export function setEbookFeedActive(next: boolean): void {
  if (ebookFeedActive === next) return;
  ebookFeedActive = next;
  emit();
}

export function isEbookFeedActive(): boolean {
  return ebookFeedActive;
}

export function subscribeEbookFeed(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isEbookReaderPath(path: string): boolean {
  const value = path.toLowerCase();
  return (
    value.includes("/reader/pdfviewer") ||
    value.includes("/reader/ebookreadaloud") ||
    value.includes("viewebook")
  );
}
