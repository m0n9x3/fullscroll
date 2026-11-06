export const VERSION = '1.3.0';

export const INTERACTIVE_SELECTOR =
  'input, textarea, select, option, button, [contenteditable="true"], [contenteditable=""]';

export const WHEEL_INTERACTIVE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [contenteditable=""]';

export const DEFAULT_LABELS = Object.freeze({
  navigation: 'Page navigation',
  page: 'Page {index} of {total}',
  horizonNavigation: 'Horizontal navigation of page {index}',
  horizonPage: 'Slide {index} of {total}',
});

const DEFAULTS = Object.freeze({
  speed: 1200,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  breakpoint: 0,
  wheelThreshold: 40,
  wheelIdle: 160,
  touchThreshold: 44,
  dots: false,
  history: true,
  effect: null,
  stepReentry: 'preserve',
  themeTarget: null,
  Swiper: null,
  labels: DEFAULT_LABELS,
  verticalSwiper: {},
  horizontalSwiper: {},
});

const STEP_REENTRIES = new Set(['preserve', 'first', 'last']);

/**
 * 라벨 템플릿의 `{key}` 자리표시자를 값으로 바꿉니다. 모르는 키는 그대로 둡니다.
 * 화면 낭독기가 읽는 문구이므로 사이트 언어에 맞게 덮어쓸 수 있어야 합니다.
 */
export function formatLabel(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}

function requireObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`[FullScroll] ${name}은 객체여야 합니다.`);
  }
}

function requireNumber(value, name, { positive = false } = {}) {
  const valid = Number.isFinite(value) && (positive ? value > 0 : value >= 0);
  if (!valid) {
    const range = positive ? '0보다 큰 유한한 숫자' : '0 이상의 유한한 숫자';
    throw new TypeError(`[FullScroll] ${name}은 ${range}여야 합니다.`);
  }
}

export function createOptions(options = {}) {
  requireObject(options, 'options');
  if (options.verticalSwiper !== undefined) {
    requireObject(options.verticalSwiper, 'verticalSwiper');
  }
  if (options.horizontalSwiper !== undefined) {
    requireObject(options.horizontalSwiper, 'horizontalSwiper');
  }
  if (options.labels !== undefined) {
    requireObject(options.labels, 'labels');
  }

  const resolved = {
    ...DEFAULTS,
    ...options,
    verticalSwiper: {
      ...DEFAULTS.verticalSwiper,
      ...(options.verticalSwiper ?? {}),
    },
    horizontalSwiper: {
      ...DEFAULTS.horizontalSwiper,
      ...(options.horizontalSwiper ?? {}),
    },
    labels: {
      ...DEFAULT_LABELS,
      ...(options.labels ?? {}),
    },
  };

  requireNumber(resolved.speed, 'speed');
  requireNumber(resolved.breakpoint, 'breakpoint');
  requireNumber(resolved.wheelThreshold, 'wheelThreshold', { positive: true });
  requireNumber(resolved.wheelIdle, 'wheelIdle', { positive: true });
  requireNumber(resolved.touchThreshold, 'touchThreshold', { positive: true });

  if (typeof resolved.easing !== 'string' || !resolved.easing.trim()) {
    throw new TypeError('[FullScroll] easing은 비어 있지 않은 문자열이어야 합니다.');
  }
  if (typeof resolved.dots !== 'boolean' || typeof resolved.history !== 'boolean') {
    throw new TypeError('[FullScroll] dots와 history는 boolean이어야 합니다.');
  }
  if (!STEP_REENTRIES.has(resolved.stepReentry)) {
    throw new TypeError('[FullScroll] stepReentry는 preserve, first, last 중 하나여야 합니다.');
  }
  for (const [key, value] of Object.entries(resolved.labels)) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new TypeError(`[FullScroll] labels.${key}는 비어 있지 않은 문자열이어야 합니다.`);
    }
  }

  return resolved;
}
