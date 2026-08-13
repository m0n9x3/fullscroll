import { describe, expect, it, vi } from 'vitest';
import { transitionToIndex, transitionToOffset } from '../src/transitions.js';

function createSwiper() {
  const listeners = new Map();
  return {
    activeIndex: 0,
    once: vi.fn((name, callback) => listeners.set(name, callback)),
    off: vi.fn((name) => listeners.delete(name)),
    slideTo: vi.fn(),
    translateTo: vi.fn(),
    emit(name) {
      listeners.get(name)?.();
    },
  };
}

describe('transition helpers', () => {
  it('resolves Swiper index and offset transitions on transitionEnd', async () => {
    const swiper = createSwiper();
    const indexTransition = transitionToIndex(swiper, 1, 120);
    swiper.emit('transitionEnd');
    await expect(indexTransition).resolves.toBeUndefined();

    const offsetTransition = transitionToOffset(swiper, 240, 120);
    swiper.emit('transitionEnd');
    await expect(offsetTransition).resolves.toBeUndefined();
  });

  it('rejects immediately and removes its listener when Swiper throws', async () => {
    const swiper = createSwiper();
    const error = new Error('transition failed');
    swiper.slideTo.mockImplementation(() => {
      throw error;
    });

    await expect(transitionToIndex(swiper, 1, 120)).rejects.toBe(error);
    expect(swiper.off).toHaveBeenCalledWith('transitionEnd', expect.any(Function));
  });
});
