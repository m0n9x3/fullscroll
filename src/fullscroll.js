import { createOptions, VERSION } from './config.js';
import { createControls } from './controls.js';
import {
  captureAttributes,
  clamp,
  resolveElement,
  restoreAttributes,
} from './dom.js';
import { createInputController } from './input.js';
import { createLocationController } from './location.js';
import { createNavigation, syncNavigation } from './navigation.js';
import {
  closestRouteToViewport,
  createResponsiveController,
  scrollRouteIntoView,
} from './responsive.js';
import { scanRoutes, toPublicRoute } from './routes.js';
import { resolveFlowView } from './flow.js';
import { EFFECT_NAMES, isEffectName } from './effects.js';
import { createRouteState } from './route-state.js';
import { mountRuntime, unmountRuntime } from './runtime.js';
import { resetRouteScroll } from './scroll.js';
import { transitionToIndex, transitionToOffset } from './transitions.js';

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

    this.flowView = null;
    this.transitionVersion = 0;

    this.onPageShow = this.onPageShow.bind(this);

    this.input = createInputController({
      root: this.root,
      options: this.options,
      isActive: () => this.active,
      isMoving: () => this.moving,
      currentHorizon: () => {
        const route = this.routes[this.currentIndex];
        return route ? this.horizons.get(route.pageIndex) : null;
      },
      move: (direction, trigger) =>
        direction > 0 ? this.next({ trigger }) : this.prev({ trigger }),
      moveWithinHorizon: (direction, trigger) =>
        direction > 0 ? this.nextWithinHorizon(trigger) : this.prevWithinHorizon(trigger),
      moveToBoundary: (boundary, trigger) =>
        this.goToRoute(boundary === 'first' ? 0 : this.routes.length - 1, { trigger }),
    });
    this.location = createLocationController({
      history: this.options.history,
      getAnchorMap: () => this.anchorMap,
      getRoutes: () => this.routes,
      getCurrentIndex: () => this.currentIndex,
      isDestroyed: () => this.destroyed,
      isMoving: () => this.moving,
      isActive: () => this.active,
      moveTo: (routeIndex, moveOptions) => this.goToRoute(routeIndex, moveOptions),
    });
    this.viewport = createResponsiveController({
      breakpoint: this.options.breakpoint,
      isDestroyed: () => this.destroyed,
      isDisabled: () => this.manualDisabled,
      isResponsive: () => this.responsive,
      isActive: () => this.active,
      isMoving: () => this.moving,
      onEnter: () => this.disableForResponsive(),
      onExit: () => this.enableFromResponsive(),
      onResize: () => this.resizeRuntime(),
    });
    this.routeState = createRouteState({
      root: this.root,
      stepReentry: this.options.stepReentry,
      themeTarget: this.options.themeTarget,
      getSnapshots: () => this.snapshots,
      warn: (message) => this.warn(message),
    });

    this.captureSnapshots();
    try {
      this.scan();
      this.setupControls();
      this.routeState.setupThemeTargets();

      const locationIndex = this.location.read();
      this.currentIndex = this.normalizeHorizonEntry(locationIndex ?? 0);

      this.installGlobalListeners();
      INSTANCES.set(root, this);

      if (this.viewport.matches()) {
        this.responsive = true;
        this.root.setAttribute('fs-responsive', '');
        scrollRouteIntoView(this.routes[this.currentIndex], false);
        this.syncControls();
      } else {
        this.enableRuntime({ rescan: false });
      }
    } catch (error) {
      this.input.detach();
      this.removeGlobalListeners();
      this.controls?.destroy();
      this.controls = null;
      this.routeState.destroy();
      this.restoreSnapshots();
      this.destroyed = true;
      INSTANCES.delete(root);
      throw error;
    }
  }

  get state() {
    const step = this.currentStepInfo();
    return Object.freeze({
      version: VERSION,
      active: this.active,
      responsive: this.responsive,
      moving: this.moving,
      currentIndex: this.currentIndex,
      total: this.routes.length,
      currentStep: step?.current ?? 1,
      totalSteps: step?.max ?? 1,
      current: this.publicRoute(this.routes[this.currentIndex]),
      routes: Object.freeze(this.routes.map((route) => this.publicRoute(route))),
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

  readEffect(attributeValue, fallback) {
    const requested = attributeValue?.trim().toLowerCase() || fallback;
    if (!requested) return 'slide';
    if (isEffectName(requested)) return requested;

    this.warn(`effect는 ${EFFECT_NAMES.join(', ')} 중 하나여야 합니다.`);
    return 'slide';
  }

  setupControls() {
    this.controls?.destroy();
    this.controls = createControls({
      isActive: () => this.active && !this.responsive && !this.manualDisabled,
      resolveRoute: (reference) => {
        const rawReference = reference.replace(/^#/, '');
        try {
          const exactAnchor = decodeURIComponent(rawReference);
          const pageIndex = this.anchorMap.get(exactAnchor);
          if (pageIndex !== undefined) return this.firstRouteIndexForPage(pageIndex);
        } catch {
          return null;
        }

        const hash = `#${rawReference}`;
        return this.location.resolve(hash);
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

  installGlobalListeners() {
    this.location.start();
    this.viewport.start();
    window.addEventListener('pageshow', this.onPageShow);
  }

  removeGlobalListeners() {
    this.location.stop();
    this.viewport.stop();
    window.removeEventListener('pageshow', this.onPageShow);
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
    this.currentIndex = this.normalizeHorizonEntry(this.currentIndex);

    const currentRoute = this.routes[this.currentIndex];
    try {
      const mounted = mountRuntime({
        root: this.root,
        pages: this.pages,
        routes: this.routes,
        horizons: this.horizons,
        currentRoute,
        Swiper: this.Swiper,
        options: this.options,
        readEffect: (value, fallback) => this.readEffect(value, fallback),
        warn: (message) => this.warn(message),
      });

      this.runtime = mounted.runtime;
      this.rootSwiper = mounted.rootSwiper;
      this.flowView = mounted.flowView;
    } catch (error) {
      this.restoreSnapshots();
      throw error;
    }

    this.active = true;
    this.input.attach();
    this.settleRuntimeRoute(currentRoute);
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

    this.input.detach();
    this.clearGeneratedNodes();
    unmountRuntime({
      root: this.root,
      runtime: this.runtime,
      rootSwiper: this.rootSwiper,
      warn: (message) => this.warn(message),
    });

    this.restoreSnapshots();
    this.rootSwiper = null;
    this.runtime = null;
    this.active = false;
    this.moving = false;
    this.flowView = null;
    this.routeState.syncMedia(null);
  }

  async goToRoute(targetIndex, { trigger = 'api', updateHistory = true, instant = false } = {}) {
    if (this.destroyed || this.moving || this.routes.length === 0) {
      return false;
    }

    const nextIndex = this.normalizeHorizonEntry(targetIndex);
    if (nextIndex === this.currentIndex) {
      return false;
    }

    if (!this.active) {
      this.currentIndex = nextIndex;
      scrollRouteIntoView(this.routes[nextIndex], true);
      if (updateHistory) {
        this.location.write(this.routes[nextIndex]);
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
    this.emit('transitionstart', detail);

    const duration = instant || this.prefersReducedMotion() ? 0 : this.options.speed;
    let changed = false;

    try {
      if (origin.pageIndex === destination.pageIndex && destination.slideIndex !== null) {
        const horizon = this.horizons.get(destination.pageIndex);
        const flowView = resolveFlowView({ horizon, destination });
        await transitionToIndex(
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
          const flowView = resolveFlowView({ horizon, destination });
          horizon.swiper.slideTo(destination.slideIndex, 0, false);
          if (flowView) {
            horizon.swiper.translateTo?.(-flowView.offset, 0, false, false);
            this.flowView = flowView;
          }
        }

        await this.transitionToVerticalRoute(destination, duration);
      }

      if (this.destroyed || !this.active || transitionVersion !== this.transitionVersion) {
        return false;
      }

      this.currentIndex = nextIndex;
      this.routeState.applyStepEntry(destination, origin);
      this.syncState();
      resetRouteScroll(origin);
      if (updateHistory) {
        this.location.write(destination);
      }
      this.emit('change', detail);
      changed = true;
      return true;
    } catch (error) {
      if (!this.destroyed && this.active && transitionVersion === this.transitionVersion) {
        try {
          this.settleRuntimeRoute(origin);
          this.syncState();
        } catch (restoreError) {
          this.warn(`실패한 이동을 복구하지 못했습니다: ${restoreError.message}`);
        }
      }
      throw error;
    } finally {
      if (!changed) {
        this.emit('transitioncancel', detail);
      }
      this.moving = false;
      this.root.removeAttribute('fs-moving');
      this.root.removeAttribute('fs-direction');
      this.input.scheduleWheelUnlock();
      this.location.flush();
    }
  }

  transitionToVerticalRoute(route, duration) {
    const footerRoute = this.runtime?.footerRoute;
    if (footerRoute) {
      if (route.flowFooter) {
        const lastPageIndex = footerRoute.pageIndex - 1;
        return Promise.all([
          transitionToIndex(this.rootSwiper, lastPageIndex, duration),
          this.transitionFooterStage(true, duration),
        ]);
      }

      if (this.routes[this.currentIndex]?.flowFooter) {
        return Promise.all([
          transitionToIndex(this.rootSwiper, route.pageIndex, duration),
          this.transitionFooterStage(false, duration),
        ]);
      }
    }

    return transitionToIndex(this.rootSwiper, route.pageIndex, duration);
  }

  settleRuntimeRoute(route) {
    if (!route || !this.runtime) return;

    this.flowView = null;
    if (route.slideIndex !== null) {
      const horizon = this.horizons.get(route.pageIndex);
      horizon?.swiper?.slideTo(route.slideIndex, 0, false);
      const flowView = resolveFlowView({ horizon, destination: route });
      if (flowView) {
        horizon.swiper.translateTo?.(-flowView.offset, 0, false, false);
        this.flowView = flowView;
      }
    }

    const footerRoute = this.runtime.footerRoute;
    if (footerRoute) {
      const showFooter = route.flowFooter;
      this.rootSwiper?.slideTo(showFooter ? footerRoute.pageIndex - 1 : route.pageIndex, 0, false);
      this.setFooterStageOffset(showFooter, 0);
    } else {
      this.rootSwiper?.slideTo(route.pageIndex, 0, false);
    }
  }

  footerHeight() {
    const footer = this.runtime?.footerRoute?.page;
    if (!footer) return 0;
    return footer.getBoundingClientRect?.().height || footer.offsetHeight || 0;
  }

  setFooterStageOffset(show, duration) {
    const stage = this.runtime?.footerStage;
    if (!stage) return;
    stage.style.transitionDuration = `${duration}ms`;
    stage.style.transform = `translate3d(0, ${show ? -this.footerHeight() : 0}px, 0)`;
  }

  transitionFooterStage(show, duration) {
    const stage = this.runtime?.footerStage;
    if (!stage) return Promise.resolve();

    if (duration === 0) {
      this.setFooterStageOffset(show, 0);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (event) => {
        if (event && (event.target !== stage || event.propertyName !== 'transform')) return;
        if (settled) return;
        settled = true;
        clearTimeout(fallback);
        stage.removeEventListener('transitionend', finish);
        resolve();
      };
      const fallback = setTimeout(finish, duration + 180);

      stage.addEventListener('transitionend', finish);
      requestAnimationFrame(() => this.setFooterStageOffset(show, duration));
    });
  }

  next(options = {}) {
    const step = this.active ? this.currentStepInfo() : null;
    if (step && step.current < step.max) {
      return this.goToStep(step.current + 1, options);
    }
    return this.goToRoute(this.verticalTargetIndex('next'), options);
  }

  prev(options = {}) {
    const step = this.active ? this.currentStepInfo() : null;
    if (step && step.current > 1) {
      return this.goToStep(step.current - 1, options);
    }
    return this.goToRoute(this.verticalTargetIndex('prev'), options);
  }

  currentStepInfo(route = this.routes[this.currentIndex]) {
    return this.routeState.stepInfo(route);
  }

  goToStep(targetStep, { trigger = 'api' } = {}) {
    if (this.destroyed || !this.active || this.moving) return Promise.resolve(false);

    const step = this.currentStepInfo();
    if (!step) return Promise.resolve(false);

    const nextStep = clamp(targetStep, 1, step.max);
    if (nextStep === step.current) return Promise.resolve(false);

    const detail = {
      current: this.publicRoute(this.routes[this.currentIndex]),
      originStep: step.current,
      destinationStep: nextStep,
      totalSteps: step.max,
      direction: nextStep > step.current ? 'next' : 'prev',
      trigger,
    };
    if (!this.emit('beforestepchange', detail, true)) return Promise.resolve(false);

    this.routeState.setStep(step.element, nextStep);
    this.syncState();
    this.emit('stepchange', detail);
    return Promise.resolve(true);
  }

  verticalTargetIndex(direction) {
    const current = this.routes[this.currentIndex];
    const horizon = current ? this.horizons.get(current.pageIndex) : null;

    if (!horizon?.only) {
      return this.currentIndex + (direction === 'next' ? 1 : -1);
    }

    const pageIndex = current.pageIndex + (direction === 'next' ? 1 : -1);
    return this.firstRouteIndexForPage(pageIndex) ?? this.currentIndex;
  }

  firstRouteIndexForPage(pageIndex) {
    return this.routes.find((route) => route.pageIndex === pageIndex)?.index ?? null;
  }

  normalizeHorizonEntry(targetIndex) {
    const index = clamp(targetIndex, 0, this.routes.length - 1);
    const destination = this.routes[index];
    const horizon = destination ? this.horizons.get(destination.pageIndex) : null;
    const origin = this.routes[this.currentIndex];

    if (!horizon || (!horizon.only && !horizon.first) || origin?.pageIndex === destination.pageIndex) {
      return index;
    }

    return this.firstRouteIndexForPage(destination.pageIndex) ?? index;
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

  resizeRuntime() {
    this.rootSwiper?.update?.();
    for (const horizon of this.horizons.values()) {
      horizon.swiper?.update?.();
    }
    this.settleRuntimeRoute(this.routes[this.currentIndex]);
    this.emit('resize', { width: window.innerWidth, height: window.innerHeight });
  }

  disableForResponsive() {
    this.teardownRuntime();
    this.responsive = true;
    this.root.setAttribute('fs-responsive', '');
    scrollRouteIntoView(this.routes[this.currentIndex], false);
    this.syncControls();
    this.emit('responsive', {
      responsive: true,
      current: this.publicRoute(this.routes[this.currentIndex]),
    });
  }

  enableFromResponsive() {
    this.currentIndex = closestRouteToViewport(this.routes, this.currentIndex);
    this.responsive = false;
    this.root.removeAttribute('fs-responsive');
    this.enableRuntime();
    this.syncControls();
    this.emit('responsive', {
      responsive: false,
      current: this.publicRoute(this.routes[this.currentIndex]),
    });
  }

  onPageShow() {
    this.location.onChange();
    this.viewport.refresh();
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
      labels: this.options.labels,
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

    this.routeState.sync(route, this.pages, this.horizons, this.flowView);
    syncNavigation(this.root, this.horizons, route);
    this.syncControls();
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

    if (this.viewport.matches()) {
      this.responsive = true;
      this.root.setAttribute('fs-responsive', '');
      scrollRouteIntoView(this.routes[this.currentIndex], false);
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
    this.routeState.setupThemeTargets();
    this.currentIndex = this.normalizeHorizonEntry(this.currentIndex);

    if (wasActive && !this.viewport.matches() && !this.manualDisabled) {
      this.enableRuntime();
    } else {
      this.syncControls();
    }

    this.emit('refresh', {
      active: this.active,
      responsive: this.responsive,
      current: this.publicRoute(this.routes[this.currentIndex]),
    });
  }

  destroy() {
    if (this.destroyed) return;

    this.teardownRuntime();

    this.removeGlobalListeners();

    this.root.removeAttribute('fs-responsive');
    this.root.removeAttribute('fs-disabled');
    this.controls?.destroy();
    this.controls = null;
    this.routeState.destroy();
    this.destroyed = true;
    INSTANCES.delete(this.root);
    this.emit('destroy', {});
  }
}
