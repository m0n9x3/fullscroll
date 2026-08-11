const STATIC_EFFECTS = Object.freeze({
  slide: { effect: 'slide' },
  fade: { effect: 'fade', fadeEffect: { crossFade: true } },
  blur: { effect: 'fade', fadeEffect: { crossFade: true } },
  zoom: {
    effect: 'creative',
    creativeEffect: {
      prev: { translate: [0, 0, -500], scale: 0.65, opacity: 0 },
      next: { translate: [0, 0, -500], scale: 1.25, opacity: 0 },
    },
  },
});

const DIRECTIONAL_EFFECTS = new Set(['creative', 'depth', 'layers']);

function translate(direction, offset, depth = 0) {
  return direction === 'vertical' ? [0, offset, depth] : [offset, 0, depth];
}

function directionalEffect(effect, direction) {
  if (effect === 'creative') {
    return {
      effect: 'creative',
      creativeEffect: {
        prev: { translate: translate(direction, '-20%', -240), scale: 0.9, opacity: 0 },
        next: { translate: translate(direction, '100%'), opacity: 0 },
      },
    };
  }

  if (effect === 'depth') {
    return {
      effect: 'creative',
      creativeEffect: {
        perspective: true,
        prev: { translate: [0, 0, -800], scale: 0.78, opacity: 0 },
        next: { translate: translate(direction, '100%'), opacity: 0 },
      },
    };
  }

  return {
    effect: 'creative',
    creativeEffect: {
      limitProgress: 2,
      prev: { translate: translate(direction, '-110%', -260), rotate: [0, 0, -12], opacity: 0 },
      next: { translate: translate(direction, '110%', -260), rotate: [0, 0, 12], opacity: 0 },
    },
  };
}

export function isEffectName(value) {
  return typeof value === 'string' && (Object.hasOwn(STATIC_EFFECTS, value) || DIRECTIONAL_EFFECTS.has(value));
}

export function resolveEffect(value, fallback = 'slide') {
  return isEffectName(value) ? value : fallback;
}

export function effectOptions(name, direction = 'horizontal') {
  const effect = resolveEffect(name);
  return DIRECTIONAL_EFFECTS.has(effect)
    ? directionalEffect(effect, direction)
    : STATIC_EFFECTS[effect];
}

export const EFFECT_NAMES = Object.freeze([...Object.keys(STATIC_EFFECTS), ...DIRECTIONAL_EFFECTS]);
