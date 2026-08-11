import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Swiper from 'swiper/bundle';
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
    this.lastTranslate = null;
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

  isHorizontal() {
    return this.options.direction === 'horizontal';
  }

  maxTranslate() {
    return -10000;
  }

  translateTo(translate, duration = 0, runCallbacks = true) {
    this.lastTranslate = translate;
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

describe('FullScroll 1.3.0', () => {
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

  it('keeps fs-flow sizing and directional companion rules on the public route', () => {
    const root = mount(`
      <main fs>
        <section fs-flow fs-anchor="compact">Compact</section>
        <section fs-horizon fs-anchor="mixed">
          <article>One</article>
          <article fs-flow fs-flow-enter="prev" fs-flow-exit="next">Two</article>
          <article>Three</article>
          <article>Four</article>
          <article fs-flow fs-flow-enter="next">Five</article>
          <article>Six</article>
        </section>
      </main>
    `);
    const instance = create(root);

    expect(instance.state.total).toBe(7);
    expect(instance.state.current.flow).toBe(true);
    expect(instance.routes[0].flow).toBe(true);
    expect(instance.routes[2].flow).toBe(true);
    expect(instance.routes[2].flowEnterWith).toBe('prev');
    expect(instance.routes[2].flowExitWith).toBe('next');
    expect(instance.routes[5].flowEnterWith).toBe('next');
    expect(FakeSwiper.instances[0].options.slidesPerView).toBe('auto');
    expect(FakeSwiper.instances[1].options.slidesPerView).toBe('auto');
    expect(FakeSwiper.instances[0].options.slidesPerGroup).toBe(1);
  });

  it('uses direction-specific companion offsets for adjacent flow slides', async () => {
    const root = mount(`
      <main fs>
        <section fs-horizon fs-anchor="mixed">
          <article>One</article>
          <article fs-flow fs-flow-enter="prev" fs-flow-exit="next">Two</article>
          <article>Three</article>
          <article>Four</article>
          <article fs-flow fs-flow-enter="next">Five</article>
          <article>Six</article>
        </section>
      </main>
    `);
    const instance = create(root);
    const horizon = instance.horizons.get(0);
    Object.defineProperty(horizon.page, 'clientWidth', { configurable: true, value: 1000 });
    const geometry = [
      [0, 1000],
      [1000, 200],
      [1200, 1000],
      [2200, 1000],
      [3200, 200],
      [3400, 1000],
    ];
    horizon.slides.forEach((slide, index) => {
      Object.defineProperty(slide, 'offsetLeft', { configurable: true, value: geometry[index][0] });
      Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: geometry[index][1] });
    });

    await instance.next();
    expect(horizon.swiper.lastTranslate).toBe(-200);
    expect(horizon.slides[0].hasAttribute('inert')).toBe(false);

    await instance.next();
    expect(horizon.swiper.lastTranslate).toBe(-1000);
    expect(horizon.slides[1].hasAttribute('inert')).toBe(false);

    await instance.moveTo('mixed', 3);
    await instance.next();
    expect(horizon.swiper.lastTranslate).toBe(-3200);
    expect(horizon.slides[5].hasAttribute('inert')).toBe(false);

    await instance.next();
    expect(horizon.swiper.activeIndex).toBe(5);
    expect(horizon.swiper.lastTranslate).toBe(-3200);
  });

  it('uses Swiper slide grids when resolving flow companion offsets', async () => {
    const root = mount(`
      <main fs>
        <section fs-horizon fs-anchor="mixed">
          <article>One</article>
          <article fs-flow fs-flow-enter="prev">Two</article>
          <article>Three</article>
        </section>
      </main>
    `);
    const instance = create(root);
    const horizon = instance.horizons.get(0);
    Object.defineProperty(horizon.page, 'clientWidth', { configurable: true, value: 1000 });
    Object.defineProperties(horizon.slides[1], {
      offsetLeft: { configurable: true, value: 1400 },
      offsetWidth: { configurable: true, value: 400 },
    });
    horizon.swiper.slidesGrid = [0, 900, 1300];
    horizon.swiper.slidesSizesGrid = [900, 200, 900];

    await instance.next();

    expect(horizon.swiper.lastTranslate).toBe(-100);
  });

  it('creates and destroys the runtime with the real Swiper package', () => {
    const root = mount();
    const instance = new FullScroll(root, {
      Swiper,
      speed: 0,
      history: false,
    });
    activeInstances.add(instance);

    expect(instance.rootSwiper).toBeInstanceOf(Swiper);
    expect(instance.horizons.get(0).swiper).toBeInstanceOf(Swiper);
    expect(instance.rootSwiper.params.allowTouchMove).toBe(false);

    instance.destroy();
    expect(root.querySelector('.swiper-wrapper')).toBeNull();
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

  it('connects declarative controls and flattened progress without JavaScript wiring', async () => {
    document.body.innerHTML = `
      <nav id="controls">
        <button fs-prev>Previous</button>
        <output fs-current><strong>Before</strong></output>
        <span fs-total>Total</span>
        <progress fs-progress></progress>
        <button fs-next>Next</button>
        <a fs-move href="#intro/3">Third intro</a>
      </nav>
      <main fs>
        <section fs-horizon fs-anchor="intro"><article>A</article><article>B</article><article>C</article></section>
        <section fs-anchor="finish">Finish</section>
      </main>
    `;
    const root = document.querySelector('[fs]');
    const instance = create(root);
    const previous = document.querySelector('[fs-prev]');
    const next = document.querySelector('[fs-next]');
    const current = document.querySelector('[fs-current]');
    const total = document.querySelector('[fs-total]');
    const progress = document.querySelector('[fs-progress]');
    const move = document.querySelector('[fs-move]');

    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    expect(current.textContent).toBe('1');
    expect(total.textContent).toBe('4');
    expect(progress.max).toBe(4);
    expect(progress.value).toBe(1);
    expect(progress.style.getPropertyValue('--fs-progress')).toBe('0.25');

    next.click();
    await Promise.resolve();
    expect(instance.state.currentIndex).toBe(1);
    expect(current.textContent).toBe('2');

    const moveEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    move.dispatchEvent(moveEvent);
    await Promise.resolve();
    expect(moveEvent.defaultPrevented).toBe(true);
    expect(instance.state.currentIndex).toBe(2);
    expect(move.getAttribute('aria-current')).toBe('page');
  });

  it('supports fs-move values and CSS-variable progress elements', async () => {
    document.body.innerHTML = `
      <button fs-move="second">Second</button>
      <div fs-progress></div>
      <main fs><section fs-anchor="first">A</section><section fs-anchor="second">B</section></main>
    `;
    const instance = create(document.querySelector('[fs]'));
    const progress = document.querySelector('[fs-progress]');

    document.querySelector('[fs-move]').click();
    await Promise.resolve();

    expect(instance.state.currentIndex).toBe(1);
    expect(progress.style.getPropertyValue('--fs-progress')).toBe('1');
    expect(progress.getAttribute('role')).toBe('progressbar');
  });

  it('restores declarative control attributes and child nodes on destroy', () => {
    document.body.innerHTML = `
      <div id="controls">
        <button fs-prev data-author="yes">Previous</button>
        <output fs-current><strong>Original</strong></output>
        <span fs-total>Unknown</span>
        <div fs-progress style="color: red"></div>
      </div>
      <main fs><section>A</section><section>B</section></main>
    `;
    const controls = document.querySelector('#controls');
    const before = controls.outerHTML;
    const instance = create(document.querySelector('[fs]'));

    instance.destroy();

    expect(controls.outerHTML).toBe(before);
  });

  it('keeps native anchor behavior and disables step controls in responsive mode', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 });
    document.body.innerHTML = `
      <button fs-next>Next</button>
      <a fs-move href="#second">Second</a>
      <main fs><section fs-anchor="first">A</section><section fs-anchor="second">B</section></main>
    `;
    const instance = create(document.querySelector('[fs]'), { breakpoint: 720 });
    const next = document.querySelector('[fs-next]');
    const move = document.querySelector('[fs-move]');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    move.dispatchEvent(event);

    expect(instance.state.responsive).toBe(true);
    expect(next.disabled).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it('discovers newly added declarative controls on refresh', () => {
    const root = mount();
    const instance = create(root);
    const current = document.createElement('output');
    current.setAttribute('fs-current', '');
    document.body.prepend(current);

    instance.refresh();

    expect(current.textContent).toBe('1');
  });

  it('makes inactive pages and horizontal slides inert', async () => {
    const root = mount();
    const instance = create(root);
    const slides = instance.horizons.get(0).slides;

    expect(instance.pages[0].hasAttribute('inert')).toBe(false);
    expect(instance.pages[1].hasAttribute('inert')).toBe(true);
    expect(slides[0].hasAttribute('inert')).toBe(false);
    expect(slides[1].hasAttribute('inert')).toBe(true);

    await instance.next();

    expect(slides[0].hasAttribute('inert')).toBe(true);
    expect(slides[1].hasAttribute('inert')).toBe(false);
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

  it('does not finish a transition after destroy invalidates the runtime', async () => {
    vi.useFakeTimers();
    const root = mount();
    const change = vi.fn();
    root.addEventListener('fullscroll:change', change);
    const instance = create(root, { speed: 20 });
    const moving = instance.next();

    instance.destroy();
    vi.advanceTimersByTime(201);

    await expect(moving).resolves.toBe(false);
    expect(change).not.toHaveBeenCalled();
    expect(instance.state.currentIndex).toBe(0);
  });

  it('scrolls the current route when manually enabling responsive mode', async () => {
    const root = mount();
    const instance = create(root, { breakpoint: 720 });
    await instance.moveTo(2);
    const target = instance.pages[2];
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    instance.disable();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 });
    instance.enable();

    expect(instance.state.responsive).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
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

  it('does not capture wheel input over editable form controls', () => {
    const root = mount();
    const instance = create(root, { wheelThreshold: 20 });
    const textarea = document.createElement('textarea');
    instance.routes[0].slide.append(textarea);
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 });

    textarea.dispatchEvent(event);

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

  it('lets a page-level fs-scroll consume wheel input', async () => {
    vi.useFakeTimers();
    const root = mount(`
      <main fs>
        <section>A</section>
        <section fs-scroll>B</section>
        <section>C</section>
      </main>
    `);
    const instance = create(root, { wheelThreshold: 20, wheelIdle: 100 });
    await instance.moveTo(1);
    const page = instance.pages[1];
    Object.defineProperties(page, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 600 },
      scrollTop: { configurable: true, writable: true, value: 120 },
    });

    page.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 }));
    expect(instance.state.currentIndex).toBe(1);

    page.scrollTop = 400;
    vi.advanceTimersByTime(101);
    page.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 }));
    await Promise.resolve();
    expect(instance.state.currentIndex).toBe(2);
  });

  it('lets a scrollable parent consume input when a nested area is at its boundary', async () => {
    vi.useFakeTimers();
    const root = mount(`
      <main fs>
        <section>A</section>
        <section><div fs-scroll><div id="nested" style="overflow-y:auto">Nested</div></div></section>
        <section>C</section>
      </main>
    `);
    const instance = create(root, { wheelThreshold: 20, wheelIdle: 100 });
    await instance.moveTo(1);
    const outer = root.querySelector('[fs-scroll]');
    const nested = root.querySelector('#nested');
    Object.defineProperties(outer, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 900 },
      scrollTop: { configurable: true, writable: true, value: 200 },
    });
    Object.defineProperties(nested, {
      clientHeight: { configurable: true, value: 150 },
      scrollHeight: { configurable: true, value: 450 },
      scrollTop: { configurable: true, writable: true, value: 300 },
    });

    nested.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 }));
    expect(instance.state.currentIndex).toBe(1);

    outer.scrollTop = 600;
    vi.advanceTimersByTime(101);
    nested.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 }));
    await Promise.resolve();
    expect(instance.state.currentIndex).toBe(2);
  });

  it('preserves scroll position by default and resets only fs-scroll-reset areas on leave', async () => {
    const root = mount(`
      <main fs>
        <section>A</section>
        <section fs-scroll fs-scroll-reset>B</section>
        <section>C</section>
      </main>
    `);
    const instance = create(root);
    const scrollPage = instance.pages[1];
    Object.defineProperty(scrollPage, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    });

    await instance.moveTo(1);
    scrollPage.scrollTop = 180;
    instance.disable();
    instance.enable();
    expect(scrollPage.scrollTop).toBe(180);

    await instance.moveTo(2);
    expect(scrollPage.scrollTop).toBe(0);
  });

  it('applies the latest location when popstate and hashchange arrive together', async () => {
    const root = mount();
    const instance = create(root, { history: true, speed: 20 });

    window.history.replaceState({}, '', '#details');
    instance.onLocationChange();
    window.history.replaceState({}, '', '#outro');
    instance.onLocationChange();

    await vi.waitFor(() => {
      expect(instance.state.current.anchor).toBe('outro');
    });
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
