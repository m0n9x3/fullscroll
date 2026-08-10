import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FullScroll from '../src/fullscroll.js';

const activeInstances = new Set();

class FakeSwiper {
  static instances = [];

  constructor(element, options = {}) {
    this.element = element;
    this.options = options;
    this.activeIndex = options.initialSlide ?? 0;
    this.listeners = new Map();
    this.destroyed = false;
    FakeSwiper.instances.push(this);
  }

  on(name, callback) {
    const callbacks = this.listeners.get(name) ?? [];
    callbacks.push(callback);
    this.listeners.set(name, callbacks);
  }

  once(name, callback) {
    const wrapped = (...args) => {
      this.off(name, wrapped);
      callback(...args);
    };
    this.on(name, wrapped);
  }

  off(name, callback) {
    const callbacks = this.listeners.get(name) ?? [];
    this.listeners.set(
      name,
      callbacks.filter((item) => item !== callback),
    );
  }

  emit(name) {
    for (const callback of [...(this.listeners.get(name) ?? [])]) {
      callback();
    }
  }

  slideTo(index, duration = 0, runCallbacks = true) {
    this.activeIndex = index;
    if (duration > 0 && runCallbacks) {
      queueMicrotask(() => this.emit('transitionEnd'));
    }
  }

  update() {}

  destroy() {
    this.destroyed = true;
    this.listeners.clear();
  }
}

function mount(markup = `
  <main fs>
    <section fs-horizon fs-anchor="intro">
      <article>Intro 1</article>
      <article>Intro 2</article>
      <article>Intro 3</article>
    </section>
    <section fs-anchor="details"><div fs-scroll>Details</div></section>
    <div fs-page fs-anchor="outro">Outro</div>
  </main>
`) {
  document.body.innerHTML = markup;
  return document.querySelector('[fs]');
}

function create(root, options = {}) {
  const instance = new FullScroll(root, {
    Swiper: FakeSwiper,
    speed: 0,
    history: false,
    ...options,
  });
  activeInstances.add(instance);
  return instance;
}

function dispatchTouch(target, type, { id, x, y }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { identifier: id, clientX: x, clientY: y };
  Object.defineProperties(event, {
    touches: { value: type === 'touchend' ? [] : [point] },
    changedTouches: { value: [point] },
  });
  target.dispatchEvent(event);
}

beforeEach(() => {
  FakeSwiper.instances = [];
  window.history.replaceState({}, '', '/');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
});

afterEach(() => {
  activeInstances.forEach((instance) => instance.destroy());
  activeInstances.clear();
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('FullScroll 1.0.0', () => {
  it('requires an external Swiper constructor', () => {
    const root = mount();
    const previousSwiper = globalThis.Swiper;
    delete globalThis.Swiper;

    expect(() => new FullScroll(root)).toThrow('Swiper가 필요합니다');
    globalThis.Swiper = previousSwiper;
  });

  it('returns the existing instance for the same root', () => {
    const root = mount();
    const instance = create(root);

    expect(new FullScroll(root, { Swiper: FakeSwiper })).toBe(instance);
    expect(FullScroll.get(root)).toBe(instance);
  });

  it('rejects nested fs-horizon markup', () => {
    const root = mount(`
      <main fs>
        <section>
          <div fs-horizon><div>A</div><div>B</div></div>
        </section>
      </main>
    `);

    expect(() => create(root)).toThrow('fs-horizon 중첩');
  });

  it('discovers direct pages and creates vertical and horizontal Swipers', () => {
    const root = mount();
    const instance = create(root);

    expect(instance.state.total).toBe(5);
    expect(FakeSwiper.instances).toHaveLength(2);
    expect(FakeSwiper.instances[0].options.direction).toBe('horizontal');
    expect(FakeSwiper.instances[1].options.direction).toBe('vertical');
    expect(root.querySelector(':scope > .fs-vertical-wrapper')).not.toBeNull();
    expect(root.querySelector('[fs-horizon] > .fs-horizon-wrapper')).not.toBeNull();
    expect(root.querySelectorAll('[fs-active]')).toHaveLength(2);
  });

  it('moves through a flattened horizontal-vertical route in order', async () => {
    const root = mount();
    const instance = create(root);

    await instance.next();
    expect(instance.state.current.pageIndex).toBe(0);
    expect(instance.state.current.slideIndex).toBe(1);
    expect(FakeSwiper.instances[0].activeIndex).toBe(1);

    await instance.next();
    await instance.next();
    expect(instance.state.current.pageIndex).toBe(1);
    expect(instance.state.current.slideIndex).toBeNull();
    expect(FakeSwiper.instances[1].activeIndex).toBe(1);

    await instance.prev();
    expect(instance.state.current.pageIndex).toBe(0);
    expect(instance.state.current.slideIndex).toBe(2);
  });

  it('allows beforechange to cancel movement', async () => {
    const root = mount();
    const instance = create(root);
    root.addEventListener('fullscroll:beforechange', (event) => event.preventDefault());

    expect(await instance.next()).toBe(false);
    expect(instance.state.currentIndex).toBe(0);
  });

  it('keeps duplicate anchors out of history after warning', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = mount(`
      <main fs>
        <section fs-anchor="same">First</section>
        <section fs-anchor="same">Second</section>
      </main>
    `);
    const instance = create(root, { history: true });

    await instance.moveTo(1);

    expect(warning).toHaveBeenCalledOnce();
    expect(instance.state.current.anchor).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('reads and writes anchor history including horizontal slide numbers', async () => {
    const root = mount();
    window.history.replaceState({}, '', '#intro/2');
    const instance = create(root, { history: true });

    expect(instance.state.current.slideIndex).toBe(1);
    await instance.moveTo('details');
    expect(window.location.hash).toBe('#details');

    await instance.moveTo('intro', 1);
    expect(window.location.hash).toBe('#intro/2');
    window.history.replaceState({}, '', '/');
    instance.onLocationChange();
    await Promise.resolve();
    expect(instance.state.currentIndex).toBe(0);
  });

  it('lets an fs-scroll region consume wheel input until its boundary', async () => {
    vi.useFakeTimers();
    const root = mount();
    const instance = create(root, { wheelThreshold: 30, wheelIdle: 100 });
    await instance.moveTo('details');
    const scrollArea = root.querySelector('[fs-scroll]');
    Object.defineProperties(scrollArea, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 600 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });

    scrollArea.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 60 }));
    expect(instance.state.current.pageIndex).toBe(1);

    scrollArea.scrollTop = 400;
    vi.advanceTimersByTime(101);
    scrollArea.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 60 }));
    await Promise.resolve();
    expect(instance.state.current.pageIndex).toBe(2);
  });

  it('moves only once until the current wheel gesture becomes idle', async () => {
    vi.useFakeTimers();
    const root = mount();
    const instance = create(root, { wheelThreshold: 20, wheelIdle: 100 });
    const wheel = () =>
      root.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 }));

    wheel();
    await Promise.resolve();
    wheel();
    await Promise.resolve();
    expect(instance.state.currentIndex).toBe(1);

    vi.advanceTimersByTime(101);
    wheel();
    await Promise.resolve();
    expect(instance.state.currentIndex).toBe(2);
  });

  it('uses normal stacked content at and below the responsive breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 });
    const root = mount();
    const instance = create(root, { breakpoint: 720 });

    expect(instance.state.responsive).toBe(true);
    expect(instance.state.active).toBe(false);
    expect(root.hasAttribute('fs-responsive')).toBe(true);
    expect(root.querySelector('.swiper-wrapper')).toBeNull();
  });

  it('switches between runtime and responsive mode on resize', () => {
    vi.useFakeTimers();
    const root = mount();
    const instance = create(root, { breakpoint: 720 });

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 });
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(121);
    expect(instance.state.responsive).toBe(true);
    expect(root.querySelector('.swiper-wrapper')).toBeNull();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(121);
    expect(instance.state.active).toBe(true);
    expect(root.querySelector(':scope > .fs-vertical-wrapper')).not.toBeNull();
  });

  it('supports keyboard movement without capturing form input', async () => {
    const root = mount();
    const instance = create(root);
    const input = document.createElement('input');
    instance.routes[0].slide.append(input);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await Promise.resolve();
    expect(instance.state.currentIndex).toBe(0);

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
    await Promise.resolve();
    expect(instance.state.currentIndex).toBe(1);
  });

  it('updates state through generated dot navigation', async () => {
    const root = mount();
    const instance = create(root, { dots: true });
    const secondHorizontalDot = root.querySelector('.fs-nav-horizon .fs-dot:nth-child(2)');

    secondHorizontalDot.click();
    await Promise.resolve();

    expect(instance.state.currentIndex).toBe(1);
    expect(secondHorizontalDot.getAttribute('aria-current')).toBe('true');
  });

  it('disables and rebuilds the runtime without losing the route', async () => {
    const root = mount();
    const instance = create(root);
    await instance.next();

    instance.disable();
    expect(instance.state.active).toBe(false);
    expect(root.hasAttribute('fs-disabled')).toBe(true);
    expect(root.querySelector('.swiper-wrapper')).toBeNull();

    instance.enable();
    expect(instance.state.active).toBe(true);
    expect(instance.state.currentIndex).toBe(1);
    expect(root.querySelector(':scope > .fs-vertical-wrapper')).not.toBeNull();
  });

  it('does not capture wheel input inside fs-ignore', () => {
    const root = mount();
    const instance = create(root, { wheelThreshold: 20 });
    const ignored = document.createElement('div');
    ignored.setAttribute('fs-ignore', '');
    instance.routes[0].slide.append(ignored);
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 });

    ignored.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(instance.state.currentIndex).toBe(0);
  });

  it('emits ready, change, and destroy events with public route details', async () => {
    const root = mount();
    const ready = vi.fn();
    const change = vi.fn();
    const destroy = vi.fn();
    root.addEventListener('fullscroll:ready', ready);
    root.addEventListener('fullscroll:change', change);
    root.addEventListener('fullscroll:destroy', destroy);
    const instance = create(root);

    expect(ready).toHaveBeenCalledOnce();
    expect(ready.mock.calls[0][0].detail.current.index).toBe(0);

    await instance.next({ trigger: 'test' });
    expect(change).toHaveBeenCalledOnce();
    expect(change.mock.calls[0][0].detail.trigger).toBe('test');
    expect(change.mock.calls[0][0].detail.destination.index).toBe(1);

    instance.destroy();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('keeps author-added pages in place when refresh rebuilds the runtime', () => {
    const root = mount();
    const instance = create(root);
    const added = document.createElement('section');
    added.setAttribute('fs-anchor', 'added');
    added.textContent = 'Added later';
    root.append(added);

    instance.refresh();

    expect(instance.state.total).toBe(6);
    expect(instance.pages.at(-1)).toBe(added);
    expect(root.querySelector('.fs-vertical-wrapper')?.lastElementChild).toBe(added);
  });

  it('turns one touch swipe into one flattened route step', async () => {
    const root = mount();
    const instance = create(root);
    const target = instance.pages[0];

    dispatchTouch(target, 'touchstart', { id: 1, x: 200, y: 500 });
    dispatchTouch(target, 'touchend', { id: 1, x: 195, y: 400 });
    await Promise.resolve();

    expect(instance.state.currentIndex).toBe(1);
    expect(instance.state.current.slideIndex).toBe(1);
  });

  it('moves after a new touch gesture starts at an fs-scroll boundary', async () => {
    const root = mount();
    const instance = create(root);
    await instance.moveTo('details');
    const scrollArea = root.querySelector('[fs-scroll]');
    Object.defineProperties(scrollArea, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 600 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });

    dispatchTouch(scrollArea, 'touchstart', { id: 7, x: 180, y: 500 });
    scrollArea.scrollTop = 400;
    dispatchTouch(scrollArea, 'touchend', { id: 7, x: 180, y: 350 });
    await Promise.resolve();
    expect(instance.state.current.pageIndex).toBe(1);

    dispatchTouch(scrollArea, 'touchstart', { id: 8, x: 180, y: 500 });
    scrollArea.scrollTop = 430;
    dispatchTouch(scrollArea, 'touchend', { id: 8, x: 180, y: 350 });
    await Promise.resolve();
    expect(instance.state.current.pageIndex).toBe(2);
  });

  it('restores the source DOM and author attributes on destroy', () => {
    const root = mount();
    const before = root.outerHTML;
    const instance = create(root, { dots: true });

    instance.destroy();

    expect(root.outerHTML).toBe(before);
    expect(FullScroll.get(root)).toBeNull();
    expect(FakeSwiper.instances.every((swiper) => swiper.destroyed)).toBe(true);
  });
});
