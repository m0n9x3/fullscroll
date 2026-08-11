import { clamp } from './dom.js';

const SCROLLABLE_OVERFLOW = /^(auto|scroll|overlay)$/;

function asElement(target) {
  if (target instanceof Element) return target;
  return target?.parentElement ?? null;
}

export function getScrollPosition(element) {
  if (!element) return null;
  const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
  return clamp(element.scrollTop, 0, maximum);
}

export function canScroll(element, direction) {
  if (!element || element.scrollHeight <= element.clientHeight + 1) {
    return false;
  }

  if (direction > 0) {
    return getScrollPosition(element) + element.clientHeight < element.scrollHeight - 1;
  }

  return getScrollPosition(element) > 1;
}

export function isScrollArea(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hasAttribute('fs-scroll')) return true;

  const style = window.getComputedStyle?.(element);
  const overflowY = style?.overflowY || style?.overflow || '';
  return SCROLLABLE_OVERFLOW.test(overflowY) && element.scrollHeight > element.clientHeight + 1;
}

export function getScrollAreas(root, target) {
  const areas = [];
  let element = asElement(target);

  while (element && element !== root) {
    if (isScrollArea(element)) {
      areas.push(element);
    }
    element = element.parentElement;
  }

  return areas;
}

export function canAnyScroll(areas, direction) {
  return areas.some((area) => canScroll(area, direction));
}

export function captureScrollGesture(areas) {
  return areas.map((area) => [area, getScrollPosition(area)]);
}

export function scrollGestureWasConsumed(snapshot) {
  return snapshot.some(
    ([area, position]) => position !== null && Math.abs(getScrollPosition(area) - position) > 1,
  );
}

export function resetRouteScroll(route) {
  const container = route?.slide ?? route?.page;
  if (!container) return;

  const resetAreas = [];
  if (container.hasAttribute('fs-scroll-reset')) {
    resetAreas.push(container);
  }
  resetAreas.push(...container.querySelectorAll('[fs-scroll-reset]'));

  resetAreas.forEach((area) => {
    area.scrollTop = 0;
    area.scrollLeft = 0;
  });
}
