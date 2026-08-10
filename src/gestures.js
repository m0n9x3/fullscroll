export function normalizeWheelDelta(event) {
  const multiplier =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? window.innerHeight
        : 1;

  return event.deltaY * multiplier;
}

export function readGesture(start, clientX, clientY, threshold) {
  const deltaX = clientX - start.x;
  const deltaY = clientY - start.y;
  const absoluteX = Math.abs(deltaX);
  const absoluteY = Math.abs(deltaY);

  if (Math.max(absoluteX, absoluteY) < threshold) {
    return null;
  }

  const vertical = absoluteY >= absoluteX;
  return {
    vertical,
    direction: vertical ? (deltaY < 0 ? 1 : -1) : deltaX < 0 ? 1 : -1,
  };
}
