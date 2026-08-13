import { describe, expect, it } from 'vitest';
import { createOptions } from '../src/config.js';

describe('createOptions', () => {
  it('merges nested Swiper options without mutating defaults', () => {
    const first = createOptions({ verticalSwiper: { loop: true } });
    const second = createOptions();

    expect(first.verticalSwiper).toEqual({ loop: true });
    expect(second.verticalSwiper).toEqual({});
  });

  it.each([
    ['speed', -1],
    ['speed', Number.NaN],
    ['breakpoint', -1],
    ['wheelThreshold', 0],
    ['wheelIdle', Number.POSITIVE_INFINITY],
    ['touchThreshold', 0],
  ])('rejects invalid numeric option %s=%s', (name, value) => {
    expect(() => createOptions({ [name]: value })).toThrow(name);
  });

  it('rejects invalid structured and enum options', () => {
    expect(() => createOptions(null)).toThrow('options');
    expect(() => createOptions({ verticalSwiper: [] })).toThrow('verticalSwiper');
    expect(() => createOptions({ horizontalSwiper: null })).toThrow('horizontalSwiper');
    expect(() => createOptions({ easing: '' })).toThrow('easing');
    expect(() => createOptions({ dots: 1 })).toThrow('dots');
    expect(() => createOptions({ history: 'yes' })).toThrow('history');
    expect(() => createOptions({ stepReentry: 'middle' })).toThrow('stepReentry');
  });
});
