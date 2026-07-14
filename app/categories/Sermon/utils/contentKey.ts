export function getContentKey(item: any): string {
  return `${item.contentType}-${
    item._id || item.fileUrl || Math.random().toString(36).substring(2)
  }`;
}
