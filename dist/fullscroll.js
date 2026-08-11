(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/config.js
  var VERSION = "1.3.0";
  var INTERACTIVE_SELECTOR = 'input, textarea, select, option, button, [contenteditable="true"], [contenteditable=""]';
  var WHEEL_INTERACTIVE_SELECTOR = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]';
  var DEFAULTS = Object.freeze({
    speed: 1200,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    breakpoint: 0,
    wheelThreshold: 40,
    wheelIdle: 160,
    touchThreshold: 44,
    dots: false,
    history: true,
    effect: null,
    stepReentry: "preserve",
    themeTarget: null,
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
      const element = document.querySelector(target);
      return element instanceof HTMLElement ? element : null;
    }
    return target instanceof HTMLElement ? target : null;
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

  // src/controls.js
  var CONTROL_SELECTOR = "[fs-prev], [fs-next], [fs-move], [fs-current], [fs-total], [fs-progress]";
  function moveReference(element) {
    const direct = element.getAttribute("fs-move")?.trim();
    if (direct) return direct;
    const href = element.getAttribute("href");
    if (!href) return null;
    try {
      return new URL(href, document.baseURI).hash || null;
    } catch {
      return null;
    }
  }
  function isDisableable(element) {
    return element instanceof HTMLButtonElement || element instanceof HTMLInputElement;
  }
  function originalAttribute(snapshot, name) {
    return snapshot.attributes.find(([attribute]) => attribute === name)?.[1] ?? null;
  }
  function setValueState(element, snapshot, name, value) {
    if (value !== null) {
      element.setAttribute(name, value);
      return;
    }
    const original = originalAttribute(snapshot, name);
    if (original === null) element.removeAttribute(name);
    else element.setAttribute(name, original);
  }
  function createControls({ isActive, resolveRoute, onPrev, onNext, onMove, warn }) {
    const elements = Array.from(document.querySelectorAll(CONTROL_SELECTOR));
    const snapshots = /* @__PURE__ */ new Map();
    const listeners = [];
    for (const element of elements) {
      snapshots.set(element, {
        attributes: captureAttributes(element),
        childNodes: Array.from(element.childNodes)
      });
    }
    const listen = (element, callback) => {
      element.addEventListener("click", callback);
      listeners.push([element, callback]);
    };
    elements.filter((element) => element.hasAttribute("fs-prev")).forEach((element) => {
      listen(element, (event) => {
        if (!isActive() || element.getAttribute("aria-disabled") === "true") {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        onPrev();
      });
    });
    elements.filter((element) => element.hasAttribute("fs-next")).forEach((element) => {
      listen(element, (event) => {
        if (!isActive() || element.getAttribute("aria-disabled") === "true") {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        onNext();
      });
    });
    const moves = elements.filter((element) => element.hasAttribute("fs-move")).map((element) => {
      const reference = moveReference(element);
      const routeIndex = reference ? resolveRoute(reference) : null;
      if (routeIndex === null) {
        warn(`fs-move \uB300\uC0C1\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${reference ?? "(\uBE44\uC5B4 \uC788\uC74C)"}`);
      }
      listen(element, (event) => {
        if (!isActive() || routeIndex === null) return;
        event.preventDefault();
        onMove(routeIndex);
      });
      return { element, routeIndex };
    });
    function sync({ active, currentIndex, total }) {
      const safeTotal = Math.max(0, total);
      const humanIndex = safeTotal === 0 ? 0 : currentIndex + 1;
      const ratio = safeTotal === 0 ? 0 : humanIndex / safeTotal;
      for (const element of elements) {
        const snapshot = snapshots.get(element);
        if (element.hasAttribute("fs-current")) {
          element.replaceChildren(String(humanIndex));
        }
        if (element.hasAttribute("fs-total")) {
          element.replaceChildren(String(safeTotal));
        }
        if (element.hasAttribute("fs-progress")) {
          element.style.setProperty("--fs-progress", String(ratio));
          setValueState(element, snapshot, "aria-valuemin", "1");
          setValueState(element, snapshot, "aria-valuemax", String(safeTotal));
          setValueState(element, snapshot, "aria-valuenow", String(humanIndex));
          setValueState(element, snapshot, "aria-valuetext", `${humanIndex} / ${safeTotal}`);
          if (element instanceof HTMLProgressElement) {
            element.max = safeTotal || 1;
            element.value = humanIndex;
          } else if (!element.hasAttribute("role")) {
            element.setAttribute("role", "progressbar");
          }
        }
        if (element.hasAttribute("fs-prev") || element.hasAttribute("fs-next")) {
          const authorDisabled = originalAttribute(snapshot, "disabled") !== null || originalAttribute(snapshot, "aria-disabled") === "true";
          const unavailable = !active || authorDisabled || safeTotal === 0 || element.hasAttribute("fs-prev") && currentIndex <= 0 || element.hasAttribute("fs-next") && currentIndex >= safeTotal - 1;
          setValueState(element, snapshot, "aria-disabled", unavailable ? "true" : null);
          if (isDisableable(element)) {
            element.disabled = unavailable;
          }
        }
      }
      for (const { element, routeIndex } of moves) {
        const snapshot = snapshots.get(element);
        setValueState(
          element,
          snapshot,
          "aria-current",
          routeIndex !== null && routeIndex === currentIndex ? "page" : null
        );
      }
    }
    function destroy() {
      listeners.forEach(([element, callback]) => element.removeEventListener("click", callback));
      for (const [element, snapshot] of snapshots) {
        restoreAttributes(element, snapshot.attributes);
        if (element.hasAttribute("fs-current") || element.hasAttribute("fs-total")) {
          element.replaceChildren(...snapshot.childNodes);
        }
      }
    }
    return { sync, destroy };
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

  // src/effects.js
  var STATIC_EFFECTS = Object.freeze({
    slide: { effect: "slide" },
    fade: { effect: "fade", fadeEffect: { crossFade: true } },
    blur: { effect: "fade", fadeEffect: { crossFade: true } },
    zoom: {
      effect: "creative",
      creativeEffect: {
        prev: { translate: [0, 0, -500], scale: 0.65, opacity: 0 },
        next: { translate: [0, 0, -500], scale: 1.25, opacity: 0 }
      }
    }
  });
  var DIRECTIONAL_EFFECTS = /* @__PURE__ */ new Set(["creative", "depth", "layers"]);
  function translate(direction, offset, depth = 0) {
    return direction === "vertical" ? [0, offset, depth] : [offset, 0, depth];
  }
  function directionalEffect(effect, direction) {
    if (effect === "creative") {
      return {
        effect: "creative",
        creativeEffect: {
          prev: { translate: translate(direction, "-20%", -240), scale: 0.9, opacity: 0 },
          next: { translate: translate(direction, "100%"), opacity: 0 }
        }
      };
    }
    if (effect === "depth") {
      return {
        effect: "creative",
        creativeEffect: {
          perspective: true,
          prev: { translate: [0, 0, -800], scale: 0.78, opacity: 0 },
          next: { translate: translate(direction, "100%"), opacity: 0 }
        }
      };
    }
    return {
      effect: "creative",
      creativeEffect: {
        limitProgress: 2,
        prev: { translate: translate(direction, "-110%", -260), rotate: [0, 0, -12], opacity: 0 },
        next: { translate: translate(direction, "110%", -260), rotate: [0, 0, 12], opacity: 0 }
      }
    };
  }
  function isEffectName(value) {
    return typeof value === "string" && (Object.hasOwn(STATIC_EFFECTS, value) || DIRECTIONAL_EFFECTS.has(value));
  }
  function resolveEffect(value, fallback = "slide") {
    return isEffectName(value) ? value : fallback;
  }
  function effectOptions(name, direction = "horizontal") {
    const effect = resolveEffect(name);
    return DIRECTIONAL_EFFECTS.has(effect) ? directionalEffect(effect, direction) : STATIC_EFFECTS[effect];
  }
  var EFFECT_NAMES = Object.freeze([...Object.keys(STATIC_EFFECTS), ...DIRECTIONAL_EFFECTS]);

  // src/routes.js
  var FLOW_RELATIONS = /* @__PURE__ */ new Set(["prev", "next"]);
  var STEP_REENTRIES = /* @__PURE__ */ new Set(["preserve", "first", "last"]);
  function readEffect(element, warn) {
    const effect = element.getAttribute("fs-effect")?.trim().toLowerCase() || null;
    if (!effect) return null;
    if (isEffectName(effect)) return effect;
    warn(`[fs-effect]\uB294 ${EFFECT_NAMES.join(", ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
    return null;
  }
  function readFlowSettings(element, warn, { allowRelations = true } = {}) {
    const flow = element.hasAttribute("fs-flow");
    const settings = {
      flow,
      flowEnterSide: null,
      flowExitSide: null
    };
    const rawValue = element.getAttribute("fs-flow")?.trim().toLowerCase() || "";
    if (!rawValue) return settings;
    if (!allowRelations) {
      warn("fs-flow\uC758 \uBC29\uD5A5\uAC12\uC740 fs-horizon\uC758 \uC9C1\uACC4 fs-flow \uC2AC\uB77C\uC774\uB4DC\uC5D0\uC11C\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
      return settings;
    }
    const sides = rawValue.split(",").map((value) => value.trim());
    if (sides.length > 2 || sides.some((value) => value && !FLOW_RELATIONS.has(value))) {
      warn("fs-flow\uC5D0\uB294 prev, next \uB610\uB294 prev,next \uD615\uC2DD\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
      return settings;
    }
    settings.flowEnterSide = sides[0] || null;
    settings.flowExitSide = sides[1] || null;
    return settings;
  }
  function readStepSettings(element, warn) {
    const rawSteps = element.getAttribute("fs-step");
    const rawReentry = element.getAttribute("fs-step-reentry")?.trim().toLowerCase() || null;
    const settings = { stepMax: 0, stepReentry: null };
    if (rawSteps !== null) {
      const stepMax = Number.parseInt(rawSteps, 10);
      if (!Number.isInteger(stepMax) || stepMax < 2 || String(stepMax) !== rawSteps.trim()) {
        warn("fs-step\uC740 2 \uC774\uC0C1\uC758 \uC815\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
      } else {
        settings.stepMax = stepMax;
      }
    }
    if (rawReentry) {
      if (!STEP_REENTRIES.has(rawReentry)) {
        warn("fs-step-reentry\uB294 preserve, first, last \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
      } else {
        settings.stepReentry = rawReentry;
      }
    }
    return settings;
  }
  function createRoute({ routes, page, pageIndex, slide = null, slideIndex = null, anchor, horizon, warn }) {
    const flow = readFlowSettings(slide ?? page, warn, { allowRelations: slide !== null });
    const step = readStepSettings(slide ?? page, warn);
    return {
      index: routes.length,
      page,
      pageIndex,
      slide,
      slideIndex,
      anchor,
      horizonOnly: horizon?.only ?? false,
      horizonFirst: horizon?.first ?? false,
      stepElement: step.stepMax ? slide ?? page : null,
      ...step,
      mediaElement: (slide ?? page).hasAttribute("fs-video") ? slide ?? page : null,
      ...flow
    };
  }
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
        throw new Error("[FullScroll] fs-horizon \uC911\uCCA9\uC740 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
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
      if (page.hasAttribute("fs-flow") && isHorizon) {
        warn(
          "fs-flow\uB294 fs-horizon\uC758 \uC9C1\uACC4 \uC2AC\uB77C\uC774\uB4DC\uC5D0 \uBD99\uC5EC\uC57C \uD569\uB2C8\uB2E4. \uAC00\uB85C \uADF8\uB8F9 \uC790\uCCB4\uC5D0\uB294 \uC801\uC6A9\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
        );
      }
      if (page.hasAttribute("fs-step") && isHorizon) {
        warn("fs-step\uC740 fs-horizon\uC758 \uC9C1\uACC4 \uC2AC\uB77C\uC774\uB4DC\uC5D0 \uBD99\uC5EC\uC57C \uD569\uB2C8\uB2E4. \uAC00\uB85C \uADF8\uB8F9 \uC790\uCCB4\uC5D0\uB294 \uC801\uC6A9\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
      }
      if (page.hasAttribute("fs-horizon") && !isHorizon) {
        warn(`\uAC00\uB85C \uADF8\uB8F9 ${pageIndex + 1}\uC5D0 \uC2AC\uB77C\uC774\uB4DC\uAC00 2\uAC1C \uC774\uC0C1 \uD544\uC694\uD569\uB2C8\uB2E4.`);
      }
      if (!isHorizon) {
        routes.push(createRoute({ routes, page, pageIndex, anchor, warn }));
        return;
      }
      const horizon = {
        page,
        pageIndex,
        slides,
        wrapper: null,
        swiper: null,
        nav: null,
        routes: [],
        effect: readEffect(page, warn),
        only: page.hasAttribute("fs-horizon-only"),
        first: page.hasAttribute("fs-horizon-first")
      };
      horizons.set(pageIndex, horizon);
      slides.forEach((slide, slideIndex) => {
        const route = createRoute({ routes, page, pageIndex, slide, slideIndex, anchor, horizon, warn });
        routes.push(route);
        horizon.routes.push(route);
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
      slide: route.slide,
      flow: route.flow,
      flowEnterSide: route.flowEnterSide,
      flowExitSide: route.flowExitSide,
      horizonOnly: route.horizonOnly,
      horizonFirst: route.horizonFirst,
      stepMax: route.stepMax,
      stepReentry: route.stepReentry
    });
  }

  // src/flow.js
  function readSlideMetrics(horizon, slideIndex) {
    const slide = horizon?.slides?.[slideIndex] ?? null;
    const swiper = horizon?.swiper;
    if (!slide || !swiper) return null;
    const gridStart = Number(swiper.slidesGrid?.[slideIndex]);
    const gridSize = Number(swiper.slidesSizesGrid?.[slideIndex]);
    const start = Number.isFinite(gridStart) ? gridStart : slide.offsetLeft;
    const size = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : slide.offsetWidth;
    return { slide, start, size };
  }
  function resolveRelation(horizon, destination) {
    if (destination.flow && destination.flowEnterSide) {
      return { flowRoute: destination, relation: destination.flowEnterSide };
    }
    const previousRoute = horizon.routes[destination.slideIndex - 1] ?? null;
    if (previousRoute?.flowExitSide === "next") {
      return { flowRoute: previousRoute, relation: "next" };
    }
    const nextRoute = horizon.routes[destination.slideIndex + 1] ?? null;
    if (nextRoute?.flowExitSide === "prev") {
      return { flowRoute: nextRoute, relation: "prev" };
    }
    return null;
  }
  function resolveFlowView({ horizon, destination }) {
    if (!horizon?.swiper || destination.slideIndex === null) return null;
    const relationView = resolveRelation(horizon, destination);
    if (!relationView) return null;
    const { flowRoute, relation } = relationView;
    const metrics = readSlideMetrics(horizon, flowRoute.slideIndex);
    const companionIndex = flowRoute.slideIndex + (relation === "prev" ? -1 : 1);
    const companion = horizon.slides[companionIndex] ?? null;
    const viewportSize = horizon.page.clientWidth || horizon.swiper.width || 0;
    if (!metrics || !viewportSize || !metrics.size || !companion) return null;
    const rawOffset = relation === "prev" ? metrics.start + metrics.size - viewportSize : metrics.start;
    const maxTranslate = Number(horizon.swiper.maxTranslate?.());
    const lastMetrics = readSlideMetrics(horizon, horizon.slides.length - 1);
    const maximum = Number.isFinite(maxTranslate) ? Math.max(0, -maxTranslate) : lastMetrics ? Math.max(0, lastMetrics.start + lastMetrics.size - viewportSize) : 0;
    return {
      offset: clamp(rawOffset, 0, maximum),
      pageIndex: horizon.pageIndex,
      flowSlide: metrics.slide,
      companion
    };
  }

  // src/media.js
  function iframeCommand(iframe, command) {
    const source = iframe.getAttribute("src") || "";
    if (!source) return;
    if (source.includes("player.vimeo.com")) {
      iframe.contentWindow?.postMessage({ method: command }, "*");
      return;
    }
    if (source.includes("youtube.com") || source.includes("youtu.be")) {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: command === "play" ? "playVideo" : "pauseVideo", args: "" }),
        "*"
      );
    }
  }
  function forEachRouteMedia(element, callback) {
    if (!element) return;
    element.querySelectorAll("video").forEach((video) => callback(video, "video"));
    element.querySelectorAll("iframe").forEach((iframe) => callback(iframe, "iframe"));
  }
  function playRouteMedia(element) {
    forEachRouteMedia(element, (media, type) => {
      if (type === "iframe") {
        iframeCommand(media, "play");
        return;
      }
      media.play?.()?.catch?.(() => {
      });
    });
  }
  function pauseRouteMedia(element) {
    forEachRouteMedia(element, (media, type) => {
      if (type === "iframe") iframeCommand(media, "pause");
      else media.pause?.();
    });
  }

  // src/scroll.js
  var SCROLLABLE_OVERFLOW = /^(auto|scroll|overlay)$/;
  function asElement(target) {
    if (target instanceof Element) return target;
    return target?.parentElement ?? null;
  }
  function getScrollPosition(element) {
    if (!element) return null;
    const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
    return clamp(element.scrollTop, 0, maximum);
  }
  function canScroll(element, direction) {
    if (!element || element.scrollHeight <= element.clientHeight + 1) {
      return false;
    }
    if (direction > 0) {
      return getScrollPosition(element) + element.clientHeight < element.scrollHeight - 1;
    }
    return getScrollPosition(element) > 1;
  }
  function isScrollArea(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.hasAttribute("fs-scroll")) return true;
    const style = window.getComputedStyle?.(element);
    const overflowY = style?.overflowY || style?.overflow || "";
    return SCROLLABLE_OVERFLOW.test(overflowY) && element.scrollHeight > element.clientHeight + 1;
  }
  function getScrollAreas(root, target) {
    const areas = [];
    let element = asElement(target);
    while (element && element !== root) {
      if (isScrollArea(element)) {
        areas.push(element);
      }
      element = element.parentElement;
    }
    return areas;
  }
  function canAnyScroll(areas, direction) {
    return areas.some((area) => canScroll(area, direction));
  }
  function captureScrollGesture(areas) {
    return areas.map((area) => [area, getScrollPosition(area)]);
  }
  function scrollGestureWasConsumed(snapshot) {
    return snapshot.some(
      ([area, position]) => position !== null && Math.abs(getScrollPosition(area) - position) > 1
    );
  }
  function resetRouteScroll(route) {
    const container = route?.slide ?? route?.page;
    if (!container) return;
    const resetAreas = [];
    if (container.hasAttribute("fs-scroll-reset")) {
      resetAreas.push(container);
    }
    resetAreas.push(...container.querySelectorAll("[fs-scroll-reset]"));
    resetAreas.forEach((area) => {
      area.scrollTop = 0;
      area.scrollLeft = 0;
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
      this.controls = null;
      this.snapshots = /* @__PURE__ */ new Map();
      this.generatedNodes = [];
      this.themeTargets = [];
      this.themeSnapshots = /* @__PURE__ */ new Map();
      this.stepStates = /* @__PURE__ */ new WeakMap();
      this.stepElement = null;
      this.activeMediaElement = null;
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
      this.setupThemeTargets();
      const locationIndex = this.routeIndexFromLocation();
      this.currentIndex = this.normalizeHorizonEntry(locationIndex ?? 0);
      window.addEventListener("resize", this.onResize, { passive: true });
      window.addEventListener("orientationchange", this.onResize, { passive: true });
      window.addEventListener("popstate", this.onLocationChange);
      window.addEventListener("hashchange", this.onLocationChange);
      window.addEventListener("pageshow", this.onPageShow);
      INSTANCES.set(root, this);
      if (this.shouldUseResponsiveMode()) {
        this.responsive = true;
        this.root.setAttribute("fs-responsive", "");
        this.scrollResponsiveTargetIntoView(false);
        this.syncControls();
      } else {
        this.enableRuntime({ rescan: false });
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
    readEffect(attributeValue, fallback) {
      const requested = attributeValue?.trim().toLowerCase() || fallback;
      if (!requested) return "slide";
      if (isEffectName(requested)) return requested;
      this.warn(`effect\uB294 ${EFFECT_NAMES.join(", ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
      return "slide";
    }
    setupControls() {
      this.controls?.destroy();
      this.controls = createControls({
        isActive: () => this.active && !this.responsive && !this.manualDisabled,
        resolveRoute: (reference) => {
          const hash = reference.startsWith("#") ? reference : `#${reference}`;
          return routeIndexFromHash(hash, this.anchorMap, this.routes);
        },
        onPrev: () => this.prev({ trigger: "control" }),
        onNext: () => this.next({ trigger: "control" }),
        onMove: (routeIndex) => this.goToRoute(routeIndex, { trigger: "control" }),
        warn: (message) => this.warn(message)
      });
    }
    setupThemeTargets() {
      this.restoreThemeTargets();
      if (!this.options.themeTarget) return;
      if (typeof this.options.themeTarget !== "string") {
        this.warn("themeTarget\uC740 \uD5E4\uB354 \uC694\uC18C\uB97C \uCC3E\uB294 CSS \uC120\uD0DD\uC790 \uBB38\uC790\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
        return;
      }
      try {
        this.themeTargets = Array.from(document.querySelectorAll(this.options.themeTarget));
      } catch {
        this.warn(`themeTarget \uC120\uD0DD\uC790\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4: ${this.options.themeTarget}`);
        return;
      }
      this.themeTargets.forEach((target) => {
        this.themeSnapshots.set(target, target.getAttribute("fs-theme"));
      });
    }
    restoreThemeTargets() {
      this.themeSnapshots.forEach((theme, target) => {
        if (theme === null) target.removeAttribute("fs-theme");
        else target.setAttribute("fs-theme", theme);
      });
      this.themeTargets = [];
      this.themeSnapshots.clear();
    }
    syncControls() {
      this.controls?.sync({
        active: this.active && !this.responsive && !this.manualDisabled,
        currentIndex: this.currentIndex,
        total: this.routes.length
      });
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
      this.currentIndex = this.normalizeHorizonEntry(this.currentIndex);
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
      const hasFlowPage = this.pages.some((page) => page.hasAttribute("fs-flow"));
      const rootAttributeEffect = this.root.getAttribute("fs-effect");
      const rootEffect = this.readEffect(
        rootAttributeEffect,
        this.options.effect ?? this.options.verticalSwiper.effect
      );
      const horizontalEffect = this.readEffect(
        rootAttributeEffect,
        this.options.effect ?? this.options.horizontalSwiper.effect
      );
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
          const hasFlowSlide = horizon.slides.some((slide) => slide.hasAttribute("fs-flow"));
          const effect = hasFlowSlide ? "slide" : horizon.effect ?? horizontalEffect;
          horizon.page.setAttribute("fs-effect-active", effect);
          const initialSlide = currentRoute.pageIndex === horizon.pageIndex && currentRoute.slideIndex !== null ? currentRoute.slideIndex : 0;
          horizon.swiper = new this.Swiper(horizon.page, {
            ...this.options.horizontalSwiper,
            ...effectOptions(effect, "horizontal"),
            direction: "horizontal",
            slidesPerView: hasFlowSlide ? "auto" : 1,
            ...hasFlowSlide ? { slidesPerGroup: 1, slidesPerGroupAuto: false } : {},
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
        const rootRuntimeEffect = hasFlowPage ? "slide" : rootEffect;
        this.root.setAttribute("fs-effect-active", rootRuntimeEffect);
        this.rootSwiper = new this.Swiper(this.root, {
          ...this.options.verticalSwiper,
          ...effectOptions(rootRuntimeEffect, "vertical"),
          direction: "vertical",
          slidesPerView: hasFlowPage ? "auto" : 1,
          ...hasFlowPage ? { slidesPerGroup: 1, slidesPerGroupAuto: false } : {},
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
      if (currentRoute.slideIndex !== null) {
        const horizon = this.horizons.get(currentRoute.pageIndex);
        const flowView = resolveFlowView({ horizon, destination: currentRoute });
        if (flowView) {
          horizon.swiper.translateTo?.(-flowView.offset, 0, false, false);
          this.flowView = flowView;
        }
      }
      this.installRuntimeListeners();
      this.buildNavigation();
      this.syncState();
      if (!this.readyOnce) {
        this.readyOnce = true;
        this.emit("ready", { current: this.publicRoute(currentRoute) });
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
      this.flowView = null;
      this.syncMedia(null);
      this.pointer = null;
      this.touch = null;
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
      const nextIndex = this.normalizeHorizonEntry(targetIndex);
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
      const direction = nextIndex > this.currentIndex ? "next" : "prev";
      const detail = {
        origin: this.publicRoute(origin),
        destination: this.publicRoute(destination),
        direction,
        trigger
      };
      const transitionVersion = this.transitionVersion;
      if (!this.emit("beforechange", detail, true)) {
        return false;
      }
      if (this.destroyed || !this.active || transitionVersion !== this.transitionVersion) {
        return false;
      }
      this.moving = true;
      this.root.setAttribute("fs-moving", "");
      this.root.setAttribute("fs-direction", direction);
      const duration = instant || this.prefersReducedMotion() ? 0 : this.options.speed;
      try {
        if (origin.pageIndex === destination.pageIndex && destination.slideIndex !== null) {
          const horizon = this.horizons.get(destination.pageIndex);
          const flowView = resolveFlowView({ horizon, destination });
          await this.transitionTo(
            horizon.swiper,
            destination.slideIndex,
            duration,
            flowView?.offset ?? null
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
          await this.transitionTo(this.rootSwiper, destination.pageIndex, duration);
        }
        if (this.destroyed || !this.active || transitionVersion !== this.transitionVersion) {
          return false;
        }
        this.currentIndex = nextIndex;
        this.applyStepEntry(destination, origin);
        this.syncState();
        resetRouteScroll(origin);
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
        this.flushLocationChange();
      }
    }
    transitionTo(swiper, index, duration, flowOffset = null) {
      if (!swiper) {
        return Promise.resolve();
      }
      if (flowOffset !== null && typeof swiper.translateTo === "function") {
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
          swiper.off?.("transitionEnd", finish);
          resolve();
        };
        const fallback = setTimeout(finish, duration + 180);
        swiper.once?.("transitionEnd", finish);
        swiper.slideTo(index, duration, true);
      });
    }
    transitionToTranslate(swiper, offset, duration) {
      const translate2 = -offset;
      if (duration === 0) {
        swiper.translateTo(translate2, 0, false, false);
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
        swiper.translateTo(translate2, duration, true, false);
      });
    }
    next(options = {}) {
      const step = this.currentStepInfo();
      if (step && step.current < step.max) {
        return this.goToStep(step.current + 1, options);
      }
      return this.goToRoute(this.verticalTargetIndex("next"), options);
    }
    prev(options = {}) {
      const step = this.currentStepInfo();
      if (step && step.current > 1) {
        return this.goToStep(step.current - 1, options);
      }
      return this.goToRoute(this.verticalTargetIndex("prev"), options);
    }
    currentStepInfo(route = this.routes[this.currentIndex]) {
      if (!route?.stepElement || route.stepMax < 2) return null;
      const current = clamp(this.stepStates.get(route.stepElement) ?? 1, 1, route.stepMax);
      return { element: route.stepElement, current, max: route.stepMax, reentry: route.stepReentry ?? this.options.stepReentry };
    }
    applyStepEntry(destination, origin) {
      const step = this.currentStepInfo(destination);
      if (!step || step.element === origin?.stepElement) return;
      if (step.reentry === "first") this.stepStates.set(step.element, 1);
      else if (step.reentry === "last") this.stepStates.set(step.element, step.max);
      else if (!this.stepStates.has(step.element)) this.stepStates.set(step.element, 1);
    }
    goToStep(targetStep, { trigger = "api" } = {}) {
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
        direction: nextStep > step.current ? "next" : "prev",
        trigger
      };
      if (!this.emit("beforestepchange", detail, true)) return Promise.resolve(false);
      this.stepStates.set(step.element, nextStep);
      this.syncState();
      this.emit("stepchange", detail);
      return Promise.resolve(true);
    }
    verticalTargetIndex(direction) {
      const current = this.routes[this.currentIndex];
      const horizon = current ? this.horizons.get(current.pageIndex) : null;
      if (!horizon?.only) {
        return this.currentIndex + (direction === "next" ? 1 : -1);
      }
      const pageIndex = current.pageIndex + (direction === "next" ? 1 : -1);
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
      if (!horizon || !horizon.only && !horizon.first || origin?.pageIndex === destination.pageIndex) {
        return index;
      }
      return this.firstRouteIndexForPage(destination.pageIndex) ?? index;
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
      const scrollAreas = getScrollAreas(this.root, event.target);
      this.pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        target: event.target,
        scrollAreas,
        scrollSnapshot: captureScrollGesture(scrollAreas)
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
      const scrollAreas = getScrollAreas(this.root, event.target);
      this.touch = {
        id: point.identifier,
        x: point.clientX,
        y: point.clientY,
        target: event.target,
        scrollAreas,
        scrollSnapshot: captureScrollGesture(scrollAreas)
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
        if (scrollGestureWasConsumed(gesture.scrollSnapshot) || canAnyScroll(gesture.scrollAreas, direction)) {
          return;
        }
      }
      const current = this.routes[this.currentIndex];
      const horizon = current ? this.horizons.get(current.pageIndex) : null;
      if (!verticalGesture && horizon?.only) {
        if (direction > 0) this.nextWithinHorizon("touch");
        else this.prevWithinHorizon("touch");
        return;
      }
      if (direction > 0) this.next({ trigger: "touch" });
      else this.prev({ trigger: "touch" });
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
      this.syncControls();
      this.emit("responsive", { responsive: true });
    }
    enableFromResponsive() {
      this.currentIndex = this.closestRouteToViewport();
      this.responsive = false;
      this.root.removeAttribute("fs-responsive");
      this.enableRuntime();
      this.syncControls();
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
            trigger: "history",
            updateHistory: false,
            instant: !this.active
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
      this.syncStep(route);
      this.syncTheme(route);
      this.syncMedia(route);
      this.syncAccessibility(route);
      syncNavigation(this.root, this.horizons, route);
      this.syncControls();
    }
    syncStep(route) {
      if (this.stepElement && this.stepElement !== route.stepElement) {
        this.stepElement.removeAttribute("fs-step-current");
      }
      const step = this.currentStepInfo(route);
      this.stepElement = step?.element ?? null;
      if (step) step.element.setAttribute("fs-step-current", String(step.current));
    }
    syncMedia(route) {
      const nextElement = route?.mediaElement ?? null;
      if (nextElement === this.activeMediaElement) return;
      pauseRouteMedia(this.activeMediaElement);
      this.activeMediaElement = nextElement;
      playRouteMedia(nextElement);
    }
    syncTheme(route) {
      const theme = route.slide?.getAttribute("fs-theme") ?? route.page.getAttribute("fs-theme");
      const targets = [this.root, ...this.themeTargets];
      targets.forEach((target) => {
        if (theme === null) {
          if (target === this.root) target.removeAttribute("fs-theme");
          else {
            const originalTheme = this.themeSnapshots.get(target);
            if (originalTheme === null) target.removeAttribute("fs-theme");
            else target.setAttribute("fs-theme", originalTheme);
          }
        } else {
          target.setAttribute("fs-theme", theme);
        }
      });
    }
    syncAccessibility(route) {
      const visibleSlides = /* @__PURE__ */ new Set([route.slide]);
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
        const intersectsViewport = hasViewport && route.flow && bounds && bounds.bottom > viewport.top + 1 && bounds.top < viewport.bottom - 1;
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
      const original = this.snapshots.get(element)?.some(([name]) => name === "inert");
      if (inactive || original) element.setAttribute("inert", "");
      else element.removeAttribute("inert");
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
      this.syncControls();
    }
    enable() {
      if (this.destroyed || !this.manualDisabled) return;
      this.manualDisabled = false;
      this.root.removeAttribute("fs-disabled");
      if (this.shouldUseResponsiveMode()) {
        this.responsive = true;
        this.root.setAttribute("fs-responsive", "");
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
      this.setupThemeTargets();
      this.currentIndex = this.normalizeHorizonEntry(this.currentIndex);
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
      window.removeEventListener("resize", this.onResize);
      window.removeEventListener("orientationchange", this.onResize);
      window.removeEventListener("popstate", this.onLocationChange);
      window.removeEventListener("hashchange", this.onLocationChange);
      window.removeEventListener("pageshow", this.onPageShow);
      this.root.removeAttribute("fs-responsive");
      this.root.removeAttribute("fs-disabled");
      this.controls?.destroy();
      this.controls = null;
      this.restoreThemeTargets();
      this.stepElement?.removeAttribute("fs-step-current");
      this.stepElement = null;
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
