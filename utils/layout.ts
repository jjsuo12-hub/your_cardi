export const TAB_BAR_BASE_HEIGHT = 72;
export const CONTENT_MAX_WIDTH = 720;
export const MIN_BOTTOM_INSET = 12;

export function getBottomInsetSpace(bottomInset: number) {
  return Math.max(bottomInset, MIN_BOTTOM_INSET);
}

export function getScrollPaddingBottom(bottomInset: number) {
  return TAB_BAR_BASE_HEIGHT + getBottomInsetSpace(bottomInset) + 32;
}
