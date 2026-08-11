import {
  createOptions,
  INTERACTIVE_SELECTOR,
  VERSION,
  WHEEL_INTERACTIVE_SELECTOR,
} from './config.js';
import { createControls } from './controls.js';
import {
  captureAttributes,
  clamp,
  closestWithin,
  resolveElement,
  restoreAttributes,
} from './dom.js';
import { normalizeWheelDelta, readGesture } from './gestures.js';
import { createNavigation, syncNavigation } from './navigation.js';
import { hashForRoute, routeIndexFromHash, scanRoutes, toPublicRoute } from './routes.js';
import { resolveFlowView } from './flow.js';
import {
  canAnyScroll,
  captureScrollGesture,
  getScrollAreas,
  resetRouteScroll,
  scrollGestureWasConsumed,
} from './scroll.js';

const INSTANCES = new WeakMap();

/**
 * FullScroll uses an externally loaded Swiper constructor as its rendering
 * engine. FullScroll owns every Swiper instance it creates.
 */
export default class FullScroll {
  static version = VERSION;

  static get(target) {
    const root = resolveElement(target);
    return root ? (INSTANCES.get(root) ?? null) : null;
  }

  constructor(target, options = {}) {
    const root = resolveElement(target);

    if (!root) {
      throw new Error('[FullScroll] 초기화할 요소를 찾을 수 없습니다.');
    }

    const existing = INSTANCES.get(root);
    if (existing) {
      return existing;
    }

    this.root = root;
    this.options = createOptions(options);

    this.Swiper = this.options.Swiper ?? globalThis.Swiper;
    if (typeof this.Swiper !== 'function') {
      throw new Error(
        '[FullScroll] Swiper가 필요합니다. Swiper를 먼저 불러오거나 Swiper 생성자를 옵션으로 전달하세요.',
      );
    }

    this.pages = [];
    this.routes = [];
    this.anchorMap = new Map();
    this.horizons = new Map();
    this.currentIndex = 0;
    this.rootSwiper = null;
    this.active = false;
    this.destroyed = false;
    this.responsive = false;
    this.manualDisabled = false;
    this.moving = false;
    this.runtime = null;
    this.controls = null;
    this.snapshots = new Map();
    this.generatedNodes = [];
    this.readyOnce = false;

    this.wheelAccumulator = 0;
    this.wheelDirection = 0;
    this.wheelGestureLocked = false;
    this.lastWheelAt = 0;
    this.lastNativeScrollAt = 0;
    this.wheelResetTimer = 0;
    this.wheelUnlockTimer = 0;
    this.resizeTimer = 0;
    this.pointer = null;
    this.touch = null;
    this.pendingLocationIndex = null;
    this.locationSyncing = false;
    this.flowView = null;
    this.transitionVersion = 0;

    this.onWheel = this.onWheel.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchCancel = this.onTouchCancel.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onLocationChange = this.onLocationChange.bind(this);
    this.onPageShow = this.onPageShow.bind(this);

    this.captureSnapshots();
    this.scan();
    this.setupControls();

    const locationIndex = this.routeIndexFromLocation();
    this.currentIndex = locationIndex ?? 0;

    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('orientationchange', this.onResize, { passive: true });
    window.addEventListener('popstate', this.onLocationChange);
    window.addEventListener('hashchange', this.onLocationChange);
    window.addEventListener('pageshow', this.onPageShow);

    INSTANCES.set(root, this);

    if (this.shouldUseResponsiveMode()) {
      this.responsive = true;
      this.root.setAttribute('fs-responsive', '');
      this.scrollResponsiveTargetIntoView(false);
      this.syncControls();
    } else {
      this.enableRuntime({ rescan: false });
    }
  }

  get state() {
    return Object.freeze({
      version: VERSION,
      active: this.active,
      responsive: this.responsive,
      moving: this.moving,
      currentIndex: this.currentIndex,
      total: this.routes.length,
      current: this.publicRoute(this.routes[this.currentIndex]),
    });
  }

  captureSnapshots() {
    this.snapshots = new Map();
    const elements = [this.root, ...this.root.querySelectorAll('*')];

    for (const element of elements) {
      this.snapshots.set(element, captureAttributes(element));
    }
  }

  restoreSnapshots() {
    for (const [element, attributes] of this.snapshots) {
      if (element === this.root || this.root.contains(element)) {
        restoreAttributes(element, attributes);
      }
    }
  }

  scan() {
    const structure = scanRoutes(this.root, (message) => this.warn(message));
    this.pages = structure.pages;
    this.routes = structure.routes;
    this.anchorMap = structure.anchorMap;
    this.horizons = structure.horizons;
  }

  setupControls() {
    this.controls?.destroy();
    this.controls = createControls({
      isActive: () => this.active && !this.responsive && !this.manualDisabled,
      resolveRoute: (reference) => {
        const hash = reference.startsWith('#') ? reference : `#${reference}`;
        return routeIndexFromHash(hash, this.anchorMap, this.routes);
      },
      onPrev: () => this.prev({ trigger: 'control' }),
      onNext: () => this.next({ trigger: 'control' }),
      onMove: (routeIndex) => this.goToRoute(routeIndex, { trigger: 'control' }),
      warn: (message) => this.warn(message),
    });
  }

  syncControls() {
    this.controls?.sync({
      active: this.active && !this.responsive && !this.manualDisabled,
      currentIndex: this.currentIndex,
      total: this.routes.length,
    });
  }

  enableRuntime({ rescan = true } = {}) {
    if (this.destroyed || this.active || this.manualDisabled) {
      return;
    }

    this.responsive = false;
    this.root.removeAttribute('fs-responsive');
    if (rescan) {
      this.scan();
    }
    this.currentIndex = clamp(this.currentIndex, 0, this.routes.length - 1);

    const currentRoute = this.routes[this.currentIndex];
    const runtime = {
      rootWrapper: document.createElement('div'),
      rootMarkers: new Map(),
      horizons: [],
    };

    this.runtime = runtime;
    runtime.rootWrapper.className = 'swiper-wrapper fs-vertical-wrapper';

    const firstPage = this.pages[0];
    this.root.insertBefore(runtime.rootWrapper, firstPage);
    this.pages.forEach((page) => {
      const marker = document.createComment('fullscroll-page');
      this.root.insertBefore(marker, page);
      runtime.rootMarkers.set(page, marker);
      page.classList.add('swiper-slide');
      runtime.rootWrapper.append(page);
    });

    this.root.classList.add('swiper', 'fs-root');
    this.root.style.setProperty('--fs-speed', `${this.options.speed}ms`);
    this.root.style.setProperty('--fs-easing', this.options.easing);
    this.root.setAttribute('fs-ready', '');

    const hasFlowPage = this.pages.some((page) => page.hasAttribute('fs-flow'));

    try {
      for (const horizon of this.horizons.values()) {
        const wrapper = document.createElement('div');
        wrapper.className = 'swiper-wrapper fs-horizon-wrapper';
        horizon.wrapper = wrapper;
        horizon.markers = new Map();

        horizon.page.insertBefore(wrapper, horizon.slides[0]);
        horizon.slides.forEach((slide) => {
          const marker = document.createComment('fullscroll-slide');
          horizon.page.insertBefore(marker, slide);
          horizon.markers.set(slide, marker);
          slide.classList.add('swiper-slide');
          wrapper.append(slide);
        });

        horizon.page.classList.add('swiper', 'fs-horizon-runtime');
        const hasFlowSlide = horizon.slides.some((slide) => slide.hasAttribute('fs-flow'));
        const initialSlide =
          currentRoute.pageIndex === horizon.pageIndex && currentRoute.slideIndex !== null
            ? currentRoute.slideIndex
            : 0;

        horizon.swiper = new this.Swiper(horizon.page, {
          ...this.options.horizontalSwiper,
          direction: 'horizontal',
          slidesPerView: hasFlowSlide ? 'auto' : 1,
          ...(hasFlowSlide ? { slidesPerGroup: 1, slidesPerGroupAuto: false } : {}),
          initialSlide,
          speed: this.options.speed,
          allowTouchMove: false,
          simulateTouch: false,
          nested: true,
          mousewheel: false,
          keyboard: false,
          observer: false,
          observeParents: false,
        });

        runtime.horizons.push(horizon);
      }

      this.rootSwiper = new this.Swiper(this.root, {
        ...this.options.verticalSwiper,
        direction: 'vertical',
        slidesPerView: hasFlowPage ? 'auto' : 1,
        ...(hasFlowPage ? { slidesPerGroup: 1, slidesPerGroupAuto: false } : {}),
        initialSlide: currentRoute.pageIndex,
        speed: this.options.speed,
        allowTouchMove: false,
        simulateTouch: false,
        mousewheel: false,
        keyboard: false,
        observer: false,
        observeParents: false,
      });
    } catch (error) {
      this.teardownRuntime();
      throw error;
    }

    this.active = true;
    this.installRuntimeListeners();
    this.buildNavigation();
    this.syncState();

    if (!this.readyOnce) {
      this.readyOnce = true;
      this.emit('ready', { current: this.publicRoute(currentRoute) });
    }
  }

  teardownRuntime() {
    this.transitionVersion += 1;
    if (!this.runtime) {
      return;
    }

    this.removeRuntimeListeners();
    this.clearGeneratedNodes();

    try {
      this.rootSwiper?.destroy?.(true, true);
    } catch (error) {
      this.warn(`세로 Swiper 제거 중 오류가 발생했습니다: ${error.message}`);
    }

    for (const horizon of this.runtime.horizons) {
      try {
        horizon.swiper?.destroy?.(true, true);
      } catch (error) {
        this.warn(`가로 Swiper 제거 중 오류가 발생했습니다: ${error.message}`);
      }
    }

    for (const horizon of this.runtime.horizons) {
      const wrapper = horizon.wrapper;
      for (const [slide, marker] of horizon.markers ?? []) {
        if (slide.parentNode === wrapper && marker.parentNode === horizon.page) {
          horizon.page.insertBefore(slide, marker);
        }
        marker.remove();
      }

      if (wrapper?.parentNode) {
        const remainingNodes = Array.from(wrapper.childNodes);
        wrapper.remove();
        horizon.page.append(...remainingNodes);
      }
    }

    const rootWrapper = this.runtime.rootWrapper;
    for (const [page, marker] of this.runtime.rootMarkers) {
      if (page.parentNode === rootWrapper && marker.parentNode === this.root) {
        this.root.insertBefore(page, marker);
      }
      marker.remove();
    }

    if (rootWrapper?.parentNode) {
      const remainingNodes = Array.from(rootWrapper.childNodes);
      rootWrapper.remove();
      this.root.append(...remainingNodes);
    }

    this.restoreSnapshots();
    this.rootSwiper = null;
    this.runtime = null;
    this.active = false;
    this.moving = false;
    this.flowView = null;
    this.pointer = null;
    this.touch = null;
  }

  installRuntimeListeners() {
    this.root.addEventListener('wheel', this.onWheel, { passive: false });
    this.root.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    this.root.addEventListener('pointerup', this.onPointerUp, { passive: true });
    this.root.addEventListener('pointercancel', this.onPointerCancel, { passive: true });
    this.root.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.root.addEventListener('touchend', this.onTouchEnd, { passive: true });
    this.root.addEventListener('touchcancel', this.onTouchCancel, { passive: true });
    document.addEventListener('keydown', this.onKeyDown);
  }

  removeRuntimeListeners() {
    this.root.removeEventListener('wheel', this.onWheel);
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    this.root.removeEventListener('pointerup', this.onPointerUp);
    this.root.removeEventListener('pointercancel', this.onPointerCancel);
    this.root.removeEventListener('touchstart', this.onTouchStart);
    this.root.removeEventListener('touchend', this.onTouchEnd);
    this.root.removeEventListener('touchcancel', this.onTouchCancel);
    document.removeEventListener('keydown', this.onKeyDown);
    clearTimeout(this.wheelResetTimer);
    clearTimeout(this.wheelUnlockTimer);
  }

  async goToRoute(targetIndex, { trigger = 'api', updateHistory = true, instant = false } = {}) {
    if (this.destroyed || this.moving || this.routes.length === 0) {
      return false;
    }

    const nextIndex = clamp(targetIndex, 0, this.routes.length - 1);
    if (nextIndex === this.currentIndex) {
      return false;
    }

    if (!this.active) {
      this.currentIndex = nextIndex;
      this.scrollResponsiveTargetIntoView(true);
      if (updateHistory) {
        this.writeHistory(this.routes[nextIndex]);
      }
      this.syncControls();
      return true;
    }

    const origin = this.routes[this.currentIndex];
    const destination = this.routes[nextIndex];
    const direction = nextIndex > this.currentIndex ? 'next' : 'prev';
    const detail = {
      origin: this.publicRoute(origin),
      destination: this.publicRoute(destination),
      direction,
      trigger,
    };

    const transitionVersion = this.transitionVersion;
    if (!this.emit('beforechange', detail, true)) {
      return false;
    }

    if (this.destroyed || !this.active || transitionVersion !== this.transitionVersion) {
      return false;
    }

    this.moving = true;
    this.root.setAttribute('fs-moving', '');
    this.root.setAttribute('fs-direction', direction);

    const duration = instant || this.prefersReducedMotion() ? 0 : this.options.speed;

    try {
      if (origin.pageIndex === destination.pageIndex && destination.slideIndex !== null) {
        const horizon = this.horizons.get(destination.pageIndex);
        const flowView = resolveFlowView({
          horizon,
          origin,
          destination,
          currentIndex: this.currentIndex,
          nextIndex,
        });
        await this.transitionTo(
          horizon.swiper,
          destination.slideIndex,
          duration,
          flowView?.offset ?? null,
        );
        this.flowView = flowView;
      } else {
        this.flowView = null;
        if (destination.slideIndex !== null) {
          const horizon = this.horizons.get(destination.pageIndex);
          horizon.swiper.slideTo(destination.slideIndex, 0, false);
        }

        await this.transitionTo(this.rootSwiper, destination.pageIndex, duration);
      }

      if (this.destroyed || !this.active || transitionVersion !== this.transitionVersion) {
        return false;
      }

      this.currentIndex = nextIndex;
      this.syncState();
      resetRouteScroll(origin);
      if (updateHistory) {
        this.writeHistory(destination);
      }
      this.emit('change', detail);
      return true;
    } finally {
      this.moving = false;
      this.root.removeAttribute('fs-moving');
      this.root.removeAttribute('fs-direction');
      this.scheduleWheelUnlock();
      this.flushLocationChange();
    }
  }

  transitionTo(swiper, index, duration, flowOffset = null) {
    if (!swiper) {
      return Promise.resolve();
    }

    if (flowOffset !== null && typeof swiper.translateTo === 'function') {
      swiper.slideTo(index, 0, false);
      return this.transitionToTranslate(swiper, flowOffset, duration);
    }

    if (duration === 0 || swiper.activeIndex === index) {
      swiper.slideTo(index, 0, false);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(fallback);
        swiper.off?.('transitionEnd', finish);
        resolve();
      };
      const fallback = setTimeout(finish, duration + 180);

      swiper.once?.('transitionEnd', finish);
      swiper.slideTo(index, duration, true);
    });
  }

  transitionToTranslate(swiper, offset, duration) {
    const translate = -offset;

    if (duration === 0) {
      swiper.translateTo(translate, 0, false, false);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(fallback);
        swiper.off?.('transitionEnd', finish);
        resolve();
      };
      const fallback = setTimeout(finish, duration + 180);

      swiper.once?.('transitionEnd', finish);
      swiper.translateTo(translate, duration, true, false);
    });
  }

  next(options = {}) {
    return this.goToRoute(this.currentIndex + 1, options);
  }

  prev(options = {}) {
    return this.goToRoute(this.currentIndex - 1, options);
  }

  moveTo(target, slideIndex = 0, options = {}) {
    let pageIndex = null;

    if (typeof target === 'string') {
      pageIndex = this.anchorMap.get(target) ?? null;
    } else if (Number.isInteger(target)) {
      pageIndex = clamp(target, 0, this.pages.length - 1);
    }

    if (pageIndex === null) {
      this.warn(`이동할 페이지를 찾을 수 없습니다: ${String(target)}`);
      return Promise.resolve(false);
    }

    const candidates = this.routes.filter((route) => route.pageIndex === pageIndex);
    const candidateIndex = clamp(Number(slideIndex) || 0, 0, candidates.length - 1);
    return this.goToRoute(candidates[candidateIndex].index, options);
  }

  onWheel(event) {
    if (!this.active || event.ctrlKey || closestWithin(this.root, event.target, '[fs-ignore]')) {
      return;
    }

    const delta = normalizeWheelDelta(event);
    const direction = Math.sign(delta);
    if (!direction) {
      return;
    }

    const now = performance.now();
    if (closestWithin(this.root, event.target, WHEEL_INTERACTIVE_SELECTOR)) {
      return;
    }

    const scrollAreas = getScrollAreas(this.root, event.target);

    if (canAnyScroll(scrollAreas, direction)) {
      this.lastNativeScrollAt = now;
      this.wheelAccumulator = 0;
      return;
    }

    event.preventDefault();
    this.lastWheelAt = now;

    if (scrollAreas.length > 0 && now - this.lastNativeScrollAt < this.options.wheelIdle) {
      return;
    }

    if (this.wheelGestureLocked || this.moving) {
      this.scheduleWheelUnlock();
      return;
    }

    if (this.wheelDirection !== direction) {
      this.wheelAccumulator = 0;
      this.wheelDirection = direction;
    }

    this.wheelAccumulator += delta;
    clearTimeout(this.wheelResetTimer);
    this.wheelResetTimer = setTimeout(() => {
      this.wheelAccumulator = 0;
      this.wheelDirection = 0;
    }, this.options.wheelIdle);

    if (Math.abs(this.wheelAccumulator) < this.options.wheelThreshold) {
      return;
    }

    this.wheelAccumulator = 0;
    this.wheelGestureLocked = true;

    const action = direction > 0 ? this.next({ trigger: 'wheel' }) : this.prev({ trigger: 'wheel' });
    Promise.resolve(action).finally(() => this.scheduleWheelUnlock());
  }

  scheduleWheelUnlock() {
    clearTimeout(this.wheelUnlockTimer);
    const elapsed = performance.now() - this.lastWheelAt;
    const delay = Math.max(0, this.options.wheelIdle - elapsed);

    this.wheelUnlockTimer = setTimeout(() => {
      if (this.moving) {
        this.scheduleWheelUnlock();
        return;
      }

      const idleFor = performance.now() - this.lastWheelAt;
      if (idleFor < this.options.wheelIdle) {
        this.scheduleWheelUnlock();
        return;
      }

      this.wheelGestureLocked = false;
      this.wheelDirection = 0;
    }, delay);
  }

  onKeyDown(event) {
    if (!this.active || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (
      event.target instanceof Element &&
      (event.target.matches(INTERACTIVE_SELECTOR) || closestWithin(this.root, event.target, '[fs-ignore]'))
    ) {
      return;
    }

    let action = null;
    if (['ArrowDown', 'PageDown'].includes(event.key) || event.code === 'Space' && !event.shiftKey) {
      action = () => this.next({ trigger: 'keyboard' });
    } else if (
      ['ArrowUp', 'PageUp'].includes(event.key) ||
      event.code === 'Space' && event.shiftKey
    ) {
      action = () => this.prev({ trigger: 'keyboard' });
    } else if (event.key === 'ArrowRight') {
      action = () => this.nextWithinHorizon('keyboard');
    } else if (event.key === 'ArrowLeft') {
      action = () => this.prevWithinHorizon('keyboard');
    } else if (event.key === 'Home') {
      action = () => this.goToRoute(0, { trigger: 'keyboard' });
    } else if (event.key === 'End') {
      action = () => this.goToRoute(this.routes.length - 1, { trigger: 'keyboard' });
    }

    if (action) {
      const result = action();
      if (result !== false) {
        event.preventDefault();
      }
    }
  }

  nextWithinHorizon(trigger) {
    const current = this.routes[this.currentIndex];
    if (current?.slideIndex === null) return false;
    const next = this.routes[this.currentIndex + 1];
    if (!next || next.pageIndex !== current.pageIndex) return false;
    return this.goToRoute(this.currentIndex + 1, { trigger });
  }

  prevWithinHorizon(trigger) {
    const current = this.routes[this.currentIndex];
    if (current?.slideIndex === null) return false;
    const previous = this.routes[this.currentIndex - 1];
    if (!previous || previous.pageIndex !== current.pageIndex) return false;
    return this.goToRoute(this.currentIndex - 1, { trigger });
  }

  onPointerDown(event) {
    if (
      !this.active ||
      event.pointerType === 'mouse' ||
      event.pointerType === 'touch' ||
      !event.isPrimary ||
      closestWithin(this.root, event.target, '[fs-ignore]') ||
      event.target instanceof Element && event.target.matches(INTERACTIVE_SELECTOR)
    ) {
      return;
    }

    const scrollAreas = getScrollAreas(this.root, event.target);
    this.pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      target: event.target,
      scrollAreas,
      scrollSnapshot: captureScrollGesture(scrollAreas),
    };
  }

  onPointerUp(event) {
    if (!this.pointer || this.pointer.id !== event.pointerId || this.moving) {
      this.pointer = null;
      return;
    }

    const pointer = this.pointer;
    this.pointer = null;
    this.finishTouchGesture(pointer, event.clientX, event.clientY);
  }

  onPointerCancel() {
    this.pointer = null;
  }

  onTouchStart(event) {
    if (
      !this.active ||
      event.touches.length > 1 ||
      closestWithin(this.root, event.target, '[fs-ignore]') ||
      (event.target instanceof Element && event.target.matches(INTERACTIVE_SELECTOR))
    ) {
      return;
    }

    const point = event.changedTouches[0];
    if (!point) return;

    const scrollAreas = getScrollAreas(this.root, event.target);
    this.touch = {
      id: point.identifier,
      x: point.clientX,
      y: point.clientY,
      target: event.target,
      scrollAreas,
      scrollSnapshot: captureScrollGesture(scrollAreas),
    };
  }

  onTouchEnd(event) {
    if (!this.touch || this.moving) {
      this.touch = null;
      return;
    }

    const touch = this.touch;
    const point = Array.from(event.changedTouches).find((item) => item.identifier === touch.id);
    if (!point) return;

    this.touch = null;
    this.finishTouchGesture(touch, point.clientX, point.clientY);
  }

  onTouchCancel() {
    this.touch = null;
  }

  finishTouchGesture(gesture, clientX, clientY) {
    const result = readGesture(gesture, clientX, clientY, this.options.touchThreshold);
    if (!result) return;

    const { direction, vertical: verticalGesture } = result;

    if (verticalGesture && gesture.scrollAreas.length > 0) {
      if (
        scrollGestureWasConsumed(gesture.scrollSnapshot) ||
        canAnyScroll(gesture.scrollAreas, direction)
      ) {
        return;
      }
    }

    if (direction > 0) {
      this.next({ trigger: 'touch' });
    } else {
      this.prev({ trigger: 'touch' });
    }
  }

  onResize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      if (this.destroyed || this.manualDisabled) return;

      const shouldRespond = this.shouldUseResponsiveMode();
      if (shouldRespond && !this.responsive) {
        this.disableForResponsive();
      } else if (!shouldRespond && this.responsive) {
        this.enableFromResponsive();
      } else if (this.active) {
        this.rootSwiper?.update?.();
        for (const horizon of this.horizons.values()) {
          horizon.swiper?.update?.();
        }
        this.emit('resize', { width: window.innerWidth, height: window.innerHeight });
      }
    }, 120);
  }

  shouldUseResponsiveMode() {
    return this.options.breakpoint > 0 && window.innerWidth <= this.options.breakpoint;
  }

  disableForResponsive() {
    this.teardownRuntime();
    this.responsive = true;
    this.root.setAttribute('fs-responsive', '');
    this.scrollResponsiveTargetIntoView(false);
    this.syncControls();
    this.emit('responsive', { responsive: true });
  }

  enableFromResponsive() {
    this.currentIndex = this.closestRouteToViewport();
    this.responsive = false;
    this.root.removeAttribute('fs-responsive');
    this.enableRuntime();
    this.syncControls();
    this.emit('responsive', { responsive: false });
  }

  closestRouteToViewport() {
    let bestIndex = clamp(this.currentIndex, 0, this.routes.length - 1);
    let bestDistance = Number.POSITIVE_INFINITY;

    this.routes.forEach((route, index) => {
      const element = route.slide ?? route.page;
      const distance = Math.abs(element.getBoundingClientRect().top);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  scrollResponsiveTargetIntoView(smooth) {
    const route = this.routes[this.currentIndex];
    const element = route?.slide ?? route?.page;
    element?.scrollIntoView?.({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }

  onLocationChange() {
    const routeIndex = this.routeIndexFromLocation() ?? (window.location.hash ? null : 0);
    if (routeIndex === null) return;

    this.pendingLocationIndex = routeIndex;
    this.flushLocationChange();
  }

  async flushLocationChange() {
    if (this.destroyed || this.locationSyncing || this.moving) return;

    this.locationSyncing = true;
    try {
      while (this.pendingLocationIndex !== null) {
        const routeIndex = this.pendingLocationIndex;
        this.pendingLocationIndex = null;
        if (routeIndex === this.currentIndex) continue;

        await this.goToRoute(routeIndex, {
          trigger: 'history',
          updateHistory: false,
          instant: !this.active,
        });
      }
    } finally {
      this.locationSyncing = false;
      if (this.pendingLocationIndex !== null && !this.moving) {
        queueMicrotask(() => this.flushLocationChange());
      }
    }
  }

  onPageShow() {
    this.onLocationChange();
    this.onResize();
  }

  routeIndexFromLocation() {
    return routeIndexFromHash(window.location.hash, this.anchorMap, this.routes);
  }

  writeHistory(route) {
    if (!this.options.history || !route?.anchor || !window.history?.pushState) {
      return;
    }

    const hash = hashForRoute(route);
    if (window.location.hash === hash) return;

    window.history.pushState(window.history.state, '', hash);
  }

  buildNavigation() {
    if (!this.options.dots || !this.active) {
      return;
    }

    this.generatedNodes = createNavigation({
      root: this.root,
      pages: this.pages,
      routes: this.routes,
      horizons: this.horizons,
      onNavigate: (routeIndex) => {
        this.goToRoute(routeIndex, { trigger: 'navigation' });
      },
    });
  }

  clearGeneratedNodes() {
    this.generatedNodes.forEach((node) => node.remove());
    this.generatedNodes = [];
  }

  syncState() {
    if (!this.active) return;

    for (const element of this.root.querySelectorAll('[fs-active]')) {
      element.removeAttribute('fs-active');
    }

    const route = this.routes[this.currentIndex];
    route.page.setAttribute('fs-active', '');
    route.slide?.setAttribute('fs-active', '');

    const viewName = route.anchor ?? String(route.pageIndex + 1);
    const view = route.slideIndex === null ? viewName : `${viewName}/${route.slideIndex + 1}`;
    this.root.setAttribute('fs-view', view);

    this.syncAccessibility(route);
    syncNavigation(this.root, this.horizons, route);
    this.syncControls();
  }

  syncAccessibility(route) {
    const visibleSlides = new Set([route.slide]);
    if (this.flowView?.pageIndex === route.pageIndex && this.flowView.companion) {
      visibleSlides.add(this.flowView.companion);
    }
    if (this.flowView?.pageIndex === route.pageIndex && this.flowView.flowSlide) {
      visibleSlides.add(this.flowView.flowSlide);
    }

    const viewport = this.root.getBoundingClientRect?.();
    const hasViewport = Boolean(viewport?.height);

    for (const page of this.pages) {
      const bounds = page.getBoundingClientRect?.();
      const intersectsViewport =
        hasViewport &&
        route.flow &&
        bounds &&
        bounds.bottom > viewport.top + 1 &&
        bounds.top < viewport.bottom - 1;
      this.setRuntimeInert(page, page !== route.page && !intersectsViewport);
    }

    for (const horizon of this.horizons.values()) {
      for (const slide of horizon.slides) {
        const inactive = horizon.page !== route.page || !visibleSlides.has(slide);
        this.setRuntimeInert(slide, inactive);
      }
    }
  }

  setRuntimeInert(element, inactive) {
    const original = this.snapshots
      .get(element)
      ?.some(([name]) => name === 'inert');

    if (inactive || original) element.setAttribute('inert', '');
    else element.removeAttribute('inert');
  }

  publicRoute(route) {
    return toPublicRoute(route);
  }

  prefersReducedMotion() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }

  emit(name, detail, cancelable = false) {
    const event = new CustomEvent(`fullscroll:${name}`, {
      detail,
      cancelable,
      bubbles: true,
    });
    return this.root.dispatchEvent(event);
  }

  warn(message) {
    if (typeof console !== 'undefined') {
      console.warn(`[FullScroll] ${message}`);
    }
  }

  disable() {
    if (this.destroyed || this.manualDisabled) return;
    this.manualDisabled = true;
    this.teardownRuntime();
    this.root.setAttribute('fs-disabled', '');
    this.syncControls();
  }

  enable() {
    if (this.destroyed || !this.manualDisabled) return;
    this.manualDisabled = false;
    this.root.removeAttribute('fs-disabled');

    if (this.shouldUseResponsiveMode()) {
      this.responsive = true;
      this.root.setAttribute('fs-responsive', '');
      this.scrollResponsiveTargetIntoView(false);
      this.syncControls();
    } else {
      this.enableRuntime();
    }
  }

  refresh() {
    if (this.destroyed) return;
    const wasActive = this.active;
    if (wasActive) this.teardownRuntime();

    this.controls?.destroy();
    this.controls = null;
    this.captureSnapshots();
    this.scan();
    this.setupControls();
    this.currentIndex = clamp(this.currentIndex, 0, this.routes.length - 1);

    if (wasActive && !this.shouldUseResponsiveMode() && !this.manualDisabled) {
      this.enableRuntime();
    } else {
      this.syncControls();
    }
  }

  destroy() {
    if (this.destroyed) return;

    this.teardownRuntime();
    clearTimeout(this.resizeTimer);
    clearTimeout(this.wheelResetTimer);
    clearTimeout(this.wheelUnlockTimer);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    window.removeEventListener('popstate', this.onLocationChange);
    window.removeEventListener('hashchange', this.onLocationChange);
    window.removeEventListener('pageshow', this.onPageShow);

    this.root.removeAttribute('fs-responsive');
    this.root.removeAttribute('fs-disabled');
    this.controls?.destroy();
    this.controls = null;
    this.destroyed = true;
    INSTANCES.delete(this.root);
    this.emit('destroy', {});
  }
}
