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

export function getDirectHorizonChildren(element) {
  const slides = [];
  const overlays = [];

  for (const child of getDirectElements(element)) {
    if (child.hasAttribute('fs-overlay')) overlays.push(child);
    else slides.push(child);
  }

  return { slides, overlays };
}

export function captureAttributes(element) {
  return Array.from(element.attributes, ({ name, value }) => [name, value]);
}

/**
 * Attributes FullScroll and its Swiper runtime may write. Anything else on the
 * element belongs to the author or another library and is never touched.
 */
const OWNED_ATTRIBUTES = Object.freeze(
  (
    'class style inert fs-active fs-disabled fs-direction fs-effect-active ' +
      'fs-flow-active fs-moving fs-ready fs-responsive fs-step-current fs-theme ' +
      'fs-view aria-current aria-disabled aria-valuemax aria-valuemin aria-valuenow ' +
      'aria-valuetext disabled role'
  ).split(' '),
);

/** Classes FullScroll adds itself. Swiper classes use the `swiper-` prefix. */
const RUNTIME_CLASS_NAMES = new Set(['swiper', 'fs-root', 'fs-horizon-runtime']);

/** Custom properties FullScroll writes through `element.style`. */
const RUNTIME_STYLE_PROPERTIES = Object.freeze(['--fs-speed', '--fs-easing', '--fs-progress']);

function parseStyleAttribute(value) {
  const probe = document.createElement('div');
  probe.setAttribute('style', value);
  const properties = new Map();
  for (const name of Array.from(probe.style)) {
    properties.set(name, [
      probe.style.getPropertyValue(name),
      probe.style.getPropertyPriority(name),
    ]);
  }
  return properties;
}

function isRuntimeClassName(name) {
  return RUNTIME_CLASS_NAMES.has(name) || name.startsWith('swiper-');
}

function restoreClassName(element, value) {
  const baseline = new Set(String(value ?? '').split(/\s+/).filter(Boolean));
  const names = new Set(element.classList);

  for (const name of baseline) names.add(name);
  for (const name of Array.from(names)) {
    if (!baseline.has(name) && isRuntimeClassName(name)) names.delete(name);
  }

  const next = Array.from(names).join(' ');
  if (!next) {
    if (element.hasAttribute('class')) element.removeAttribute('class');
    return;
  }

  if (element.getAttribute('class') !== next) element.setAttribute('class', next);
}

function matchesBaselineStyle(style, baseline) {
  if (style.length !== baseline.size) return false;

  for (const [name, [value, priority]] of baseline) {
    if (style.getPropertyValue(name) !== value) return false;
    if (style.getPropertyPriority(name) !== priority) return false;
  }

  return true;
}

function restoreStyle(element, value) {
  const baseline = value ? parseStyleAttribute(value) : new Map();
  const style = element.style;

  for (const name of RUNTIME_STYLE_PROPERTIES) {
    if (!baseline.has(name)) {
      style.removeProperty(name);
      continue;
    }

    const [propertyValue, priority] = baseline.get(name);
    if (
      style.getPropertyValue(name) !== propertyValue ||
      style.getPropertyPriority(name) !== priority
    ) {
      style.setProperty(name, propertyValue, priority);
    }
  }

  for (const [name, [propertyValue, priority]] of baseline) {
    if (RUNTIME_STYLE_PROPERTIES.includes(name)) continue;
    if (style.getPropertyValue(name) !== '') continue;
    style.setProperty(name, propertyValue, priority);
  }

  if (!matchesBaselineStyle(style, baseline)) return;

  if (!value) {
    if (element.hasAttribute('style')) element.removeAttribute('style');
  } else if (element.getAttribute('style') !== value) {
    element.setAttribute('style', value);
  }
}

/**
 * Restores the attributes FullScroll owns to their captured values. Attributes
 * the author or another library added or changed while the runtime was active
 * are left alone, and runtime classes and custom properties are cleaned up.
 */
export function restoreAttributes(element, attributes) {
  const baseline = new Map(attributes);

  for (const name of OWNED_ATTRIBUTES) {
    if (name === 'class') {
      restoreClassName(element, baseline.get(name) ?? null);
      continue;
    }

    if (name === 'style') {
      restoreStyle(element, baseline.get(name) ?? null);
      continue;
    }

    if (!baseline.has(name)) {
      element.removeAttribute(name);
      continue;
    }

    const value = baseline.get(name);
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
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
