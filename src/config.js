export const VERSION = '1.3.0';

export const INTERACTIVE_SELECTOR =
  'input, textarea, select, option, button, [contenteditable="true"], [contenteditable=""]';

export const WHEEL_INTERACTIVE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [contenteditable=""]';

const DEFAULTS = Object.freeze({
  speed: 700,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  breakpoint: 0,
  wheelThreshold: 40,
  wheelIdle: 160,
  touchThreshold: 44,
  dots: false,
  history: true,
  Swiper: null,
  verticalSwiper: {},
  horizontalSwiper: {},
});

export function createOptions(options = {}) {
  return {
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
  };
}
