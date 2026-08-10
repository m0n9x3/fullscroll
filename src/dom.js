export function resolveElement(target) {
  if (typeof target === 'string') {
    return document.querySelector(target);
  }

  return target instanceof Element ? target : null;
}

export function getDirectPages(root) {
  return Array.from(root.children).filter(
    (element) => element.tagName === 'SECTION' || element.hasAttribute('fs-page'),
  );
}

export function getDirectElements(element) {
  return Array.from(element.children).filter((child) => child instanceof HTMLElement);
}

export function captureAttributes(element) {
  return Array.from(element.attributes, ({ name, value }) => [name, value]);
}

export function restoreAttributes(element, attributes) {
  for (const attribute of Array.from(element.attributes)) {
    element.removeAttribute(attribute.name);
  }

  for (const [name, value] of attributes) {
    element.setAttribute(name, value);
  }
}

export function closestWithin(root, target, selector) {
  if (!(target instanceof Element)) {
    return null;
  }

  const match = target.closest(selector);
  return match && (match === root || root.contains(match)) ? match : null;
}

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function canScroll(element, direction) {
  if (!element || element.scrollHeight <= element.clientHeight + 1) {
    return false;
  }

  if (direction > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  }

  return element.scrollTop > 1;
}

export function getScrollPosition(element) {
  if (!element) return null;
  const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
  return clamp(element.scrollTop, 0, maximum);
}
