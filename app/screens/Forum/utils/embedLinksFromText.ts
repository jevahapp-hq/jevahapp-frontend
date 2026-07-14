import { extractLinkMetadata } from "../../../utils/communityHelpers";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export type EmbeddedLink = {
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  type: "video" | "article" | "resource" | "other";
};

/**
 * Extract URLs from text and resolve link metadata (max 5),
 * matching create/edit post behavior in ForumScreen.
 */
export async function embedLinksFromText(text: string): Promise<EmbeddedLink[]> {
  const urls = text.match(URL_REGEX) || [];
  const embeddedLinks: EmbeddedLink[] = [];

  for (const url of urls.slice(0, 5)) {
    const linkMetadata = await extractLinkMetadata(url);
    embeddedLinks.push({
      url,
      ...linkMetadata,
    });
  }

  return embeddedLinks;
}
