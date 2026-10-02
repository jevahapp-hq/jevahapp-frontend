/** Page index from a vertical PDF scroll, 1-based. */
export function pageFromScrollPosition(
  scrollY: number,
  tapY: number,
  contentHeight: number,
  _viewHeight: number,
  viewWidth: number,
  knownTotal: number
): number | null {
  if (!(contentHeight > 40)) return null;
  const y = Math.max(0, scrollY) + Math.max(0, tapY || 0);
  const total = knownTotal > 1 ? knownTotal : 0;
  const pageHeight =
    total > 1 ? contentHeight / total : viewWidth > 80 ? viewWidth * (11 / 8.5) : 0;
  if (!(pageHeight > 40)) return null;
  const pages = total > 1 ? total : Math.max(1, Math.round(contentHeight / pageHeight));
  const page = Math.floor(y / pageHeight) + 1;
  if (page < 1) return 1;
  if (page > pages) return pages;
  return page;
}

/** Largest /Count on a PDF Pages tree, from a text snippet of the file. */
export function pdfPageCountFromSnippet(text: string): number | null {
  if (!text) return null;
  const counts: number[] = [];
  const patterns = [
    /\/Type\s*\/Pages\b[\s\S]{0,400}?\/Count\s+(\d+)/g,
    /\/Count\s+(\d+)[\s\S]{0,120}?\/Type\s*\/Pages\b/g,
  ];
  for (const re of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const n = parseInt(match[1], 10);
      if (n > 0 && n < 20000) counts.push(n);
    }
  }
  if (!counts.length) return null;
  return Math.max(...counts);
}
