export function resolveElement(target) {
  if (typeof target === 'string') {
    const element = document.querySelector(target);
    return element instanceof HTMLElement ? element : null;
  }

  return target instanceof HTMLElement ? target : null;
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
