/** Peek HUD (play + seek) is part of the comment overlay clock. */
export function isCommentPeekHudVisible(
  isVisible: boolean,
  isClosing: boolean
): boolean {
  return isVisible && !isClosing;
}
