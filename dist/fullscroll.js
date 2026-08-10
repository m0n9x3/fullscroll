(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/config.js
  var VERSION = "1.0.0";
  var INTERACTIVE_SELECTOR = 'input, textarea, select, option, button, [contenteditable="true"], [contenteditable=""]';
  var DEFAULTS = Object.freeze({
    speed: 700,
    easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    breakpoint: 0,
    wheelThreshold: 40,
    wheelIdle: 160,
    touchThreshold: 44,
    dots: false,
    history: true,
    Swiper: null,
    verticalSwiper: {},
    horizontalSwiper: {}
  });
  function createOptions(options = {}) {
    return {
      ...DEFAULTS,
      ...options,
      verticalSwiper: {
        ...DEFAULTS.verticalSwiper,
        ...options.verticalSwiper ?? {}
      },
      horizontalSwiper: {
        ...DEFAULTS.horizontalSwiper,
        ...options.horizontalSwiper ?? {}
      }
    };
  }

  // src/dom.js
  function resolveElement(target) {
    if (typeof target === "string") {
      return document.querySelector(target);
    }
    return target instanceof Element ? target : null;
  }
  function getDirectPages(root) {
    return Array.from(root.children).filter(
      (element) => element.tagName === "SECTION" || element.hasAttribute("fs-page")
    );
  }
  function getDirectElements(element) {
    return Array.from(element.children).filter((child) => child instanceof HTMLElement);
  }
  function captureAttributes(element) {
    return Array.from(element.attributes, ({ name, value }) => [name, value]);
  }
  function restoreAttributes(element, attributes) {
    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name);
    }
    for (const [name, value] of attributes) {
      element.setAttribute(name, value);
    }
  }
  function closestWithin(root, target, selector) {
    if (!(target instanceof Element)) {
      return null;
    }
    const match = target.closest(selector);
    return match && (match === root || root.contains(match)) ? match : null;
  }
  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }
  function canScroll(element, direction) {
    if (!element || element.scrollHeight <= element.clientHeight + 1) {
      return false;
    }
    if (direction > 0) {
      return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
    }
    return element.scrollTop > 1;
  }
  function getScrollPosition(element) {
    if (!element) return null;
    const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
    return clamp(element.scrollTop, 0, maximum);
  }

  // src/gestures.js
  function normalizeWheelDelta(event) {
    const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1;
    return event.deltaY * multiplier;
  }
  function readGesture(start, clientX, clientY, threshold) {
    const deltaX = clientX - start.x;
    const deltaY = clientY - start.y;
    const absoluteX = Math.abs(deltaX);
    const absoluteY = Math.abs(deltaY);
    if (Math.max(absoluteX, absoluteY) < threshold) {
      return null;
    }
    const vertical = absoluteY >= absoluteX;
    return {
      vertical,
      direction: vertical ? deltaY < 0 ? 1 : -1 : deltaX < 0 ? 1 : -1
    };
  }

  // src/navigation.js
  function createNavigation({ root, pages, routes, horizons, onNavigate }) {
    const generatedNodes = [];
    const verticalNav = document.createElement("nav");
    verticalNav.className = "fs-nav fs-nav-vertical";
    verticalNav.setAttribute("fs-ignore", "");
    verticalNav.setAttribute("aria-label", "\uD398\uC774\uC9C0 \uC774\uB3D9");
    pages.forEach((page, pageIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fs-dot";
      button.setAttribute("aria-label", `${pageIndex + 1}\uBC88\uC9F8 \uD398\uC774\uC9C0`);
      button.addEventListener("click", () => {
        const route = routes.find((item) => item.pageIndex === pageIndex);
        onNavigate(route.index);
      });
      verticalNav.append(button);
    });
    root.append(verticalNav);
    generatedNodes.push(verticalNav);
    for (const horizon of horizons.values()) {
      const nav = document.createElement("nav");
      nav.className = "fs-nav fs-nav-horizon";
      nav.setAttribute("fs-ignore", "");
      nav.setAttribute("aria-label", `${horizon.pageIndex + 1}\uBC88\uC9F8 \uD398\uC774\uC9C0\uC758 \uAC00\uB85C \uC774\uB3D9`);
      horizon.slides.forEach((slide, slideIndex) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fs-dot";
        button.setAttribute("aria-label", `${slideIndex + 1}\uBC88\uC9F8 \uAC00\uB85C \uD398\uC774\uC9C0`);
        button.addEventListener("click", () => {
          const route = routes.find(
            (item) => item.pageIndex === horizon.pageIndex && item.slideIndex === slideIndex
          );
          onNavigate(route.index);
        });
        nav.append(button);
      });
      horizon.page.append(nav);
      horizon.nav = nav;
      generatedNodes.push(nav);
    }
    return generatedNodes;
  }
  function syncNavigation(root, horizons, route) {
    root.querySelectorAll(".fs-nav-vertical .fs-dot").forEach((button, index) => {
      if (index === route.pageIndex) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    for (const horizon of horizons.values()) {
      const buttons = horizon.nav?.querySelectorAll(".fs-dot") ?? [];
      buttons.forEach((button, index) => {
        if (horizon.pageIndex === route.pageIndex && index === route.slideIndex) {
          button.setAttribute("aria-current", "true");
        } else {
          button.removeAttribute("aria-current");
        }
      });
    }
  }

  // src/routes.js
  function scanRoutes(root, warn) {
    const pages = getDirectPages(root);
    const routes = [];
    const anchorMap = /* @__PURE__ */ new Map();
    const horizons = /* @__PURE__ */ new Map();
    if (pages.length === 0) {
      throw new Error("[FullScroll] [fs] \uBC14\uB85C \uC544\uB798\uC5D0 section \uB610\uB294 [fs-page] \uC694\uC18C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
    }
    pages.forEach((page, pageIndex) => {
      const nestedHorizon = page.querySelector("[fs-horizon]");
      if (nestedHorizon && nestedHorizon !== page) {
        throw new Error("[FullScroll] fs-horizon \uC911\uCCA9\uC740 1.0.0\uC5D0\uC11C \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
      }
      let anchor = page.getAttribute("fs-anchor")?.trim() || null;
      if (anchor) {
        if (anchorMap.has(anchor)) {
          warn(`\uC911\uBCF5\uB41C fs-anchor="${anchor}"\uAC00 \uC788\uC2B5\uB2C8\uB2E4. \uCCAB \uBC88\uC9F8 \uC575\uCEE4\uB9CC \uC0AC\uC6A9\uD569\uB2C8\uB2E4.`);
          anchor = null;
        } else {
          anchorMap.set(anchor, pageIndex);
        }
      }
      const slides = page.hasAttribute("fs-horizon") ? getDirectElements(page) : [];
      const isHorizon = slides.length >= 2;
      if (page.hasAttribute("fs-horizon") && !isHorizon) {
        warn(`\uAC00\uB85C \uADF8\uB8F9 ${pageIndex + 1}\uC5D0 \uC2AC\uB77C\uC774\uB4DC\uAC00 2\uAC1C \uC774\uC0C1 \uD544\uC694\uD569\uB2C8\uB2E4.`);
      }
      if (!isHorizon) {
        routes.push({
          index: routes.length,
          page,
          pageIndex,
          slide: null,
          slideIndex: null,
          anchor
        });
        return;
      }
      horizons.set(pageIndex, {
        page,
        pageIndex,
        slides,
        wrapper: null,
        swiper: null,
        nav: null
      });
      slides.forEach((slide, slideIndex) => {
        routes.push({
          index: routes.length,
          page,
          pageIndex,
          slide,
          slideIndex,
          anchor
        });
      });
    });
    return { pages, routes, anchorMap, horizons };
  }
  function routeIndexFromHash(hash, anchorMap, routes) {
    const rawHash = hash.replace(/^#/, "");
    if (!rawHash) return null;
    let decoded;
    try {
      decoded = decodeURIComponent(rawHash);
    } catch {
      return null;
    }
    const [anchor, rawSlide] = decoded.split("/");
    const pageIndex = anchorMap.get(anchor);
    if (pageIndex === void 0) return null;
    const candidates = routes.filter((route) => route.pageIndex === pageIndex);
    const humanSlide = Number.parseInt(rawSlide, 10);
    const slideIndex = Number.isFinite(humanSlide) ? clamp(humanSlide - 1, 0, candidates.length - 1) : 0;
    return candidates[slideIndex].index;
  }
  function hashForRoute(route) {
    if (!route?.anchor) return null;
    const suffix = route.slideIndex === null ? "" : `/${route.slideIndex + 1}`;
    return `#${encodeURIComponent(route.anchor)}${suffix}`;
  }
  function toPublicRoute(route) {
    if (!route) return null;
    return Object.freeze({
      index: route.index,
      pageIndex: route.pageIndex,
      slideIndex: route.slideIndex,
      anchor: route.anchor,
      page: route.page,
      slide: route.slide
    });
  }

  // src/fullscroll.js
  var INSTANCES = /* @__PURE__ */ new WeakMap();
  var FullScroll = class {
    static get(target) {
      const root = resolveElement(target);
      return root ? INSTANCES.get(root) ?? null : null;
    }
    constructor(target, options = {}) {
      const root = resolveElement(target);
      if (!root) {
        throw new Error("[FullScroll] \uCD08\uAE30\uD654\uD560 \uC694\uC18C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      }
      const existing = INSTANCES.get(root);
      if (existing) {
        return existing;
      }
      this.root = root;
      this.options = createOptions(options);
      this.Swiper = this.options.Swiper ?? globalThis.Swiper;
      if (typeof this.Swiper !== "function") {
        throw new Error(
          "[FullScroll] Swiper\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4. Swiper\uB97C \uBA3C\uC800 \uBD88\uB7EC\uC624\uAC70\uB098 Swiper \uC0DD\uC131\uC790\uB97C \uC635\uC158\uC73C\uB85C \uC804\uB2EC\uD558\uC138\uC694."
        );
      }
      this.pages = [];
      this.routes = [];
      this.anchorMap = /* @__PURE__ */ new Map();
      this.horizons = /* @__PURE__ */ new Map();
      this.currentIndex = 0;
      this.rootSwiper = null;
      this.active = false;
      this.destroyed = false;
      this.responsive = false;
      this.manualDisabled = false;
      this.moving = false;
      this.runtime = null;
      this.snapshots = /* @__PURE__ */ new Map();
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
      this.captureSnapshots();
      this.scan();
      const locationIndex = this.routeIndexFromLocation();
      this.currentIndex = locationIndex ?? 0;
      window.addEventListener("resize", this.onResize, { passive: true });
      window.addEventListener("orientationchange", this.onResize, { passive: true });
      window.addEventListener("popstate", this.onLocationChange);
      window.addEventListener("hashchange", this.onLocationChange);
      INSTANCES.set(root, this);
      if (this.shouldUseResponsiveMode()) {
        this.responsive = true;
        this.root.setAttribute("fs-responsive", "");
        this.scrollResponsiveTargetIntoView(false);
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
        current: this.publicRoute(this.routes[this.currentIndex])
      });
    }
    captureSnapshots() {
      this.snapshots = /* @__PURE__ */ new Map();
      const elements = [this.root, ...this.root.querySelectorAll("*")];
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
    enableRuntime({ rescan = true } = {}) {
      if (this.destroyed || this.active || this.manualDisabled) {
        return;
      }
      this.responsive = false;
      this.root.removeAttribute("fs-responsive");
      if (rescan) {
        this.scan();
      }
      this.currentIndex = clamp(this.currentIndex, 0, this.routes.length - 1);
      const currentRoute = this.routes[this.currentIndex];
      const runtime = {
        rootWrapper: document.createElement("div"),
        rootMarkers: /* @__PURE__ */ new Map(),
        horizons: []
      };
      this.runtime = runtime;
      runtime.rootWrapper.className = "swiper-wrapper fs-vertical-wrapper";
      const firstPage = this.pages[0];
      this.root.insertBefore(runtime.rootWrapper, firstPage);
      this.pages.forEach((page) => {
        const marker = document.createComment("fullscroll-page");
        this.root.insertBefore(marker, page);
        runtime.rootMarkers.set(page, marker);
        page.classList.add("swiper-slide");
        runtime.rootWrapper.append(page);
      });
      this.root.classList.add("swiper", "fs-root");
      this.root.style.setProperty("--fs-speed", `${this.options.speed}ms`);
      this.root.style.setProperty("--fs-easing", this.options.easing);
      this.root.setAttribute("fs-ready", "");
      try {
        for (const horizon of this.horizons.values()) {
          const wrapper = document.createElement("div");
          wrapper.className = "swiper-wrapper fs-horizon-wrapper";
          horizon.wrapper = wrapper;
          horizon.markers = /* @__PURE__ */ new Map();
          horizon.page.insertBefore(wrapper, horizon.slides[0]);
          horizon.slides.forEach((slide) => {
            const marker = document.createComment("fullscroll-slide");
            horizon.page.insertBefore(marker, slide);
            horizon.markers.set(slide, marker);
            slide.classList.add("swiper-slide");
            wrapper.append(slide);
          });
          horizon.page.classList.add("swiper", "fs-horizon-runtime");
          const initialSlide = currentRoute.pageIndex === horizon.pageIndex && currentRoute.slideIndex !== null ? currentRoute.slideIndex : 0;
          horizon.swiper = new this.Swiper(horizon.page, {
            ...this.options.horizontalSwiper,
            direction: "horizontal",
            slidesPerView: 1,
            initialSlide,
            speed: this.options.speed,
            allowTouchMove: false,
            simulateTouch: false,
            nested: true,
            mousewheel: false,
            keyboard: false,
            observer: false,
            observeParents: false
          });
          runtime.horizons.push(horizon);
        }
        this.rootSwiper = new this.Swiper(this.root, {
          ...this.options.verticalSwiper,
          direction: "vertical",
          slidesPerView: 1,
          initialSlide: currentRoute.pageIndex,
          speed: this.options.speed,
          allowTouchMove: false,
          simulateTouch: false,
          mousewheel: false,
          keyboard: false,
          observer: false,
          observeParents: false
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
        this.emit("ready", { current: this.publicRoute(currentRoute) });
      }
    }
    teardownRuntime() {
      if (!this.runtime) {
        return;
      }
      this.removeRuntimeListeners();
      this.clearGeneratedNodes();
      try {
        this.rootSwiper?.destroy?.(true, true);
      } catch (error) {
        this.warn(`\uC138\uB85C Swiper \uC81C\uAC70 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error.message}`);
      }
      for (const horizon of this.runtime.horizons) {
        try {
          horizon.swiper?.destroy?.(true, true);
        } catch (error) {
          this.warn(`\uAC00\uB85C Swiper \uC81C\uAC70 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error.message}`);
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
      this.pointer = null;
    }
    installRuntimeListeners() {
      this.root.addEventListener("wheel", this.onWheel, { passive: false });
      this.root.addEventListener("pointerdown", this.onPointerDown, { passive: true });
      this.root.addEventListener("pointerup", this.onPointerUp, { passive: true });
      this.root.addEventListener("pointercancel", this.onPointerCancel, { passive: true });
      this.root.addEventListener("touchstart", this.onTouchStart, { passive: true });
      this.root.addEventListener("touchend", this.onTouchEnd, { passive: true });
      this.root.addEventListener("touchcancel", this.onTouchCancel, { passive: true });
      document.addEventListener("keydown", this.onKeyDown);
    }
    removeRuntimeListeners() {
      this.root.removeEventListener("wheel", this.onWheel);
      this.root.removeEventListener("pointerdown", this.onPointerDown);
      this.root.removeEventListener("pointerup", this.onPointerUp);
      this.root.removeEventListener("pointercancel", this.onPointerCancel);
      this.root.removeEventListener("touchstart", this.onTouchStart);
      this.root.removeEventListener("touchend", this.onTouchEnd);
      this.root.removeEventListener("touchcancel", this.onTouchCancel);
      document.removeEventListener("keydown", this.onKeyDown);
      clearTimeout(this.wheelResetTimer);
      clearTimeout(this.wheelUnlockTimer);
    }
    async goToRoute(targetIndex, { trigger = "api", updateHistory = true, instant = false } = {}) {
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
        return true;
      }
      const origin = this.routes[this.currentIndex];
      const destination = this.routes[nextIndex];
      const direction = nextIndex > this.currentIndex ? "next" : "prev";
      const detail = {
        origin: this.publicRoute(origin),
        destination: this.publicRoute(destination),
        direction,
        trigger
      };
      if (!this.emit("beforechange", detail, true)) {
        return false;
      }
      this.moving = true;
      this.root.setAttribute("fs-moving", "");
      this.root.setAttribute("fs-direction", direction);
      const duration = instant || this.prefersReducedMotion() ? 0 : this.options.speed;
      try {
        if (origin.pageIndex === destination.pageIndex && destination.slideIndex !== null) {
          const horizon = this.horizons.get(destination.pageIndex);
          await this.transitionTo(horizon.swiper, destination.slideIndex, duration);
        } else {
          if (destination.slideIndex !== null) {
            const horizon = this.horizons.get(destination.pageIndex);
            horizon.swiper.slideTo(destination.slideIndex, 0, false);
          }
          await this.transitionTo(this.rootSwiper, destination.pageIndex, duration);
        }
        this.currentIndex = nextIndex;
        this.syncState();
        if (updateHistory) {
          this.writeHistory(destination);
        }
        this.emit("change", detail);
        return true;
      } finally {
        this.moving = false;
        this.root.removeAttribute("fs-moving");
        this.root.removeAttribute("fs-direction");
        this.scheduleWheelUnlock();
      }
    }
    transitionTo(swiper, index, duration) {
      if (!swiper) {
        return Promise.resolve();
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
          swiper.off?.("transitionEnd", finish);
          resolve();
        };
        const fallback = setTimeout(finish, duration + 180);
        swiper.once?.("transitionEnd", finish);
        swiper.slideTo(index, duration, true);
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
      if (typeof target === "string") {
        pageIndex = this.anchorMap.get(target) ?? null;
      } else if (Number.isInteger(target)) {
        pageIndex = clamp(target, 0, this.pages.length - 1);
      }
      if (pageIndex === null) {
        this.warn(`\uC774\uB3D9\uD560 \uD398\uC774\uC9C0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${String(target)}`);
        return Promise.resolve(false);
      }
      const candidates = this.routes.filter((route) => route.pageIndex === pageIndex);
      const candidateIndex = clamp(Number(slideIndex) || 0, 0, candidates.length - 1);
      return this.goToRoute(candidates[candidateIndex].index, options);
    }
    onWheel(event) {
      if (!this.active || event.ctrlKey || closestWithin(this.root, event.target, "[fs-ignore]")) {
        return;
      }
      const delta = normalizeWheelDelta(event);
      const direction = Math.sign(delta);
      if (!direction) {
        return;
      }
      const now = performance.now();
      const scrollArea = closestWithin(this.root, event.target, "[fs-scroll]");
      if (scrollArea && canScroll(scrollArea, direction)) {
        this.lastNativeScrollAt = now;
        this.wheelAccumulator = 0;
        return;
      }
      event.preventDefault();
      this.lastWheelAt = now;
      if (scrollArea && now - this.lastNativeScrollAt < this.options.wheelIdle) {
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
      const action = direction > 0 ? this.next({ trigger: "wheel" }) : this.prev({ trigger: "wheel" });
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
      if (event.target instanceof Element && (event.target.matches(INTERACTIVE_SELECTOR) || closestWithin(this.root, event.target, "[fs-ignore]"))) {
        return;
      }
      let action = null;
      if (["ArrowDown", "PageDown"].includes(event.key) || event.code === "Space" && !event.shiftKey) {
        action = () => this.next({ trigger: "keyboard" });
      } else if (["ArrowUp", "PageUp"].includes(event.key) || event.code === "Space" && event.shiftKey) {
        action = () => this.prev({ trigger: "keyboard" });
      } else if (event.key === "ArrowRight") {
        action = () => this.nextWithinHorizon("keyboard");
      } else if (event.key === "ArrowLeft") {
        action = () => this.prevWithinHorizon("keyboard");
      } else if (event.key === "Home") {
        action = () => this.goToRoute(0, { trigger: "keyboard" });
      } else if (event.key === "End") {
        action = () => this.goToRoute(this.routes.length - 1, { trigger: "keyboard" });
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
      if (!this.active || event.pointerType === "mouse" || event.pointerType === "touch" || !event.isPrimary || closestWithin(this.root, event.target, "[fs-ignore]") || event.target instanceof Element && event.target.matches(INTERACTIVE_SELECTOR)) {
        return;
      }
      const scrollArea = closestWithin(this.root, event.target, "[fs-scroll]");
      this.pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        target: event.target,
        scrollArea,
        scrollTop: getScrollPosition(scrollArea)
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
      if (!this.active || event.touches.length > 1 || closestWithin(this.root, event.target, "[fs-ignore]") || event.target instanceof Element && event.target.matches(INTERACTIVE_SELECTOR)) {
        return;
      }
      const point = event.changedTouches[0];
      if (!point) return;
      const scrollArea = closestWithin(this.root, event.target, "[fs-scroll]");
      this.touch = {
        id: point.identifier,
        x: point.clientX,
        y: point.clientY,
        target: event.target,
        scrollArea,
        scrollTop: getScrollPosition(scrollArea)
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
      if (verticalGesture && gesture.scrollArea) {
        const consumedByInnerScroll = gesture.scrollTop !== null && Math.abs(getScrollPosition(gesture.scrollArea) - gesture.scrollTop) > 1;
        if (consumedByInnerScroll || canScroll(gesture.scrollArea, direction)) {
          return;
        }
      }
      if (direction > 0) {
        this.next({ trigger: "touch" });
      } else {
        this.prev({ trigger: "touch" });
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
          this.emit("resize", { width: window.innerWidth, height: window.innerHeight });
        }
      }, 120);
    }
    shouldUseResponsiveMode() {
      return this.options.breakpoint > 0 && window.innerWidth <= this.options.breakpoint;
    }
    disableForResponsive() {
      this.teardownRuntime();
      this.responsive = true;
      this.root.setAttribute("fs-responsive", "");
      this.scrollResponsiveTargetIntoView(false);
      this.emit("responsive", { responsive: true });
    }
    enableFromResponsive() {
      this.currentIndex = this.closestRouteToViewport();
      this.responsive = false;
      this.root.removeAttribute("fs-responsive");
      this.enableRuntime();
      this.emit("responsive", { responsive: false });
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
      element?.scrollIntoView?.({ behavior: smooth ? "smooth" : "auto", block: "start" });
    }
    onLocationChange() {
      const routeIndex = this.routeIndexFromLocation() ?? (window.location.hash ? null : 0);
      if (routeIndex === null || routeIndex === this.currentIndex) {
        return;
      }
      this.goToRoute(routeIndex, {
        trigger: "history",
        updateHistory: false,
        instant: !this.active
      });
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
      window.history.pushState(window.history.state, "", hash);
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
          this.goToRoute(routeIndex, { trigger: "navigation" });
        }
      });
    }
    clearGeneratedNodes() {
      this.generatedNodes.forEach((node) => node.remove());
      this.generatedNodes = [];
    }
    syncState() {
      if (!this.active) return;
      for (const element of this.root.querySelectorAll("[fs-active]")) {
        element.removeAttribute("fs-active");
      }
      const route = this.routes[this.currentIndex];
      route.page.setAttribute("fs-active", "");
      route.slide?.setAttribute("fs-active", "");
      const viewName = route.anchor ?? String(route.pageIndex + 1);
      const view = route.slideIndex === null ? viewName : `${viewName}/${route.slideIndex + 1}`;
      this.root.setAttribute("fs-view", view);
      syncNavigation(this.root, this.horizons, route);
    }
    publicRoute(route) {
      return toPublicRoute(route);
    }
    prefersReducedMotion() {
      return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    }
    emit(name, detail, cancelable = false) {
      const event = new CustomEvent(`fullscroll:${name}`, {
        detail,
        cancelable,
        bubbles: true
      });
      return this.root.dispatchEvent(event);
    }
    warn(message) {
      if (typeof console !== "undefined") {
        console.warn(`[FullScroll] ${message}`);
      }
    }
    disable() {
      if (this.destroyed || this.manualDisabled) return;
      this.manualDisabled = true;
      this.teardownRuntime();
      this.root.setAttribute("fs-disabled", "");
    }
    enable() {
      if (this.destroyed || !this.manualDisabled) return;
      this.manualDisabled = false;
      this.root.removeAttribute("fs-disabled");
      if (this.shouldUseResponsiveMode()) {
        this.responsive = true;
        this.root.setAttribute("fs-responsive", "");
      } else {
        this.enableRuntime();
      }
    }
    refresh() {
      if (this.destroyed) return;
      const wasActive = this.active;
      if (wasActive) this.teardownRuntime();
      this.captureSnapshots();
      this.scan();
      this.currentIndex = clamp(this.currentIndex, 0, this.routes.length - 1);
      if (wasActive && !this.shouldUseResponsiveMode() && !this.manualDisabled) {
        this.enableRuntime();
      }
    }
    destroy() {
      if (this.destroyed) return;
      this.teardownRuntime();
      clearTimeout(this.resizeTimer);
      clearTimeout(this.wheelResetTimer);
      clearTimeout(this.wheelUnlockTimer);
      window.removeEventListener("resize", this.onResize);
      window.removeEventListener("orientationchange", this.onResize);
      window.removeEventListener("popstate", this.onLocationChange);
      window.removeEventListener("hashchange", this.onLocationChange);
      this.root.removeAttribute("fs-responsive");
      this.root.removeAttribute("fs-disabled");
      this.destroyed = true;
      INSTANCES.delete(this.root);
      this.emit("destroy", {});
    }
  };
  __publicField(FullScroll, "version", VERSION);

  // src/browser.js
  globalThis.FullScroll = FullScroll;
})();
//# sourceMappingURL=fullscroll.js.map
