import { contentRouteFromUrl } from "../src/shared/share/contentShare";

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  return contentRouteFromUrl(path) || path;
}
