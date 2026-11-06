(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/config.js
  var VERSION = "1.3.0";
  var INTERACTIVE_SELECTOR = 'input, textarea, select, option, button, [contenteditable="true"], [contenteditable=""]';
  var WHEEL_INTERACTIVE_SELECTOR = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]';
  var DEFAULT_LABELS = Object.freeze({
    navigation: "Page navigation",
    page: "Page {index} of {total}",
    horizonNavigation: "Horizontal navigation of page {index}",
    horizonPage: "Slide {index} of {total}"
  });
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
    labels: DEFAULT_LABELS,
    verticalSwiper: {},
    horizontalSwiper: {}
  });
  var STEP_REENTRIES = /* @__PURE__ */ new Set(["preserve", "first", "last"]);
  function formatLabel(template, values = {}) {
    return template.replace(
      /\{(\w+)\}/g,
      (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match
    );
  }
  function requireObject(value, name) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`[FullScroll] ${name}\uC740 \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
    }
  }
  function requireNumber(value, name, { positive = false } = {}) {
    const valid = Number.isFinite(value) && (positive ? value > 0 : value >= 0);
    if (!valid) {
      const range = positive ? "0\uBCF4\uB2E4 \uD070 \uC720\uD55C\uD55C \uC22B\uC790" : "0 \uC774\uC0C1\uC758 \uC720\uD55C\uD55C \uC22B\uC790";
      throw new TypeError(`[FullScroll] ${name}\uC740 ${range}\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
    }
  }
  function createOptions(options = {}) {
    requireObject(options, "options");
    if (options.verticalSwiper !== void 0) {
      requireObject(options.verticalSwiper, "verticalSwiper");
    }
    if (options.horizontalSwiper !== void 0) {
      requireObject(options.horizontalSwiper, "horizontalSwiper");
    }
    if (options.labels !== void 0) {
      requireObject(options.labels, "labels");
    }
    const resolved = {
      ...DEFAULTS,
      ...options,
      verticalSwiper: {
        ...DEFAULTS.verticalSwiper,
        ...options.verticalSwiper ?? {}
      },
      horizontalSwiper: {
        ...DEFAULTS.horizontalSwiper,
        ...options.horizontalSwiper ?? {}
      },
      labels: {
        ...DEFAULT_LABELS,
        ...options.labels ?? {}
      }
    };
    requireNumber(resolved.speed, "speed");
    requireNumber(resolved.breakpoint, "breakpoint");
    requireNumber(resolved.wheelThreshold, "wheelThreshold", { positive: true });
    requireNumber(resolved.wheelIdle, "wheelIdle", { positive: true });
    requireNumber(resolved.touchThreshold, "touchThreshold", { positive: true });
    if (typeof resolved.easing !== "string" || !resolved.easing.trim()) {
      throw new TypeError("[FullScroll] easing\uC740 \uBE44\uC5B4 \uC788\uC9C0 \uC54A\uC740 \uBB38\uC790\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
    }
    if (typeof resolved.dots !== "boolean" || typeof resolved.history !== "boolean") {
      throw new TypeError("[FullScroll] dots\uC640 history\uB294 boolean\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
    }
    if (!STEP_REENTRIES.has(resolved.stepReentry)) {
      throw new TypeError("[FullScroll] stepReentry\uB294 preserve, first, last \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
    }
    for (const [key, value] of Object.entries(resolved.labels)) {
      if (typeof value !== "string" || !value.trim()) {
        throw new TypeError(`[FullScroll] labels.${key}\uB294 \uBE44\uC5B4 \uC788\uC9C0 \uC54A\uC740 \uBB38\uC790\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.`);
      }
    }
    return resolved;
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
  function getDirectHorizonChildren(element) {
    const slides = [];
    const overlays = [];
    for (const child of getDirectElements(element)) {
      if (child.hasAttribute("fs-overlay")) overlays.push(child);
      else slides.push(child);
    }
    return { slides, overlays };
  }
  function captureAttributes(element) {
    return Array.from(element.attributes, ({ name, value }) => [name, value]);
  }
  var OWNED_ATTRIBUTES = Object.freeze(
    "class style inert fs-active fs-disabled fs-direction fs-effect-active fs-flow-active fs-moving fs-ready fs-responsive fs-step-current fs-theme fs-view aria-current aria-disabled aria-valuemax aria-valuemin aria-valuenow aria-valuetext disabled role".split(" ")
  );
  var RUNTIME_CLASS_NAMES = /* @__PURE__ */ new Set(["swiper", "fs-root", "fs-horizon-runtime"]);
  var RUNTIME_STYLE_PROPERTIES = Object.freeze(["--fs-speed", "--fs-easing", "--fs-progress"]);
  function parseStyleAttribute(value) {
    const probe = document.createElement("div");
    probe.setAttribute("style", value);
    const properties = /* @__PURE__ */ new Map();
    for (const name of Array.from(probe.style)) {
      properties.set(name, [
        probe.style.getPropertyValue(name),
        probe.style.getPropertyPriority(name)
      ]);
    }
    return properties;
  }
  function isRuntimeClassName(name) {
    return RUNTIME_CLASS_NAMES.has(name) || name.startsWith("swiper-");
  }
  function restoreClassName(element, value) {
    const baseline = new Set(String(value ?? "").split(/\s+/).filter(Boolean));
    const names = new Set(element.classList);
    for (const name of baseline) names.add(name);
    for (const name of Array.from(names)) {
      if (!baseline.has(name) && isRuntimeClassName(name)) names.delete(name);
    }
    const next = Array.from(names).join(" ");
    if (!next) {
      if (element.hasAttribute("class")) element.removeAttribute("class");
      return;
    }
    if (element.getAttribute("class") !== next) element.setAttribute("class", next);
  }
  function matchesBaselineStyle(style, baseline) {
    if (style.length !== baseline.size) return false;
    for (const [name, [value, priority]] of baseline) {
      if (style.getPropertyValue(name) !== value) return false;
      if (style.getPropertyPriority(name) !== priority) return false;
    }
    return true;
  }
  function restoreStyle(element, value) {
    const baseline = value ? parseStyleAttribute(value) : /* @__PURE__ */ new Map();
    const style = element.style;
    for (const name of RUNTIME_STYLE_PROPERTIES) {
      if (!baseline.has(name)) {
        style.removeProperty(name);
        continue;
      }
      const [propertyValue, priority] = baseline.get(name);
      if (style.getPropertyValue(name) !== propertyValue || style.getPropertyPriority(name) !== priority) {
        style.setProperty(name, propertyValue, priority);
      }
    }
    for (const [name, [propertyValue, priority]] of baseline) {
      if (RUNTIME_STYLE_PROPERTIES.includes(name)) continue;
      if (style.getPropertyValue(name) !== "") continue;
      style.setProperty(name, propertyValue, priority);
    }
    if (!matchesBaselineStyle(style, baseline)) return;
    if (!value) {
      if (element.hasAttribute("style")) element.removeAttribute("style");
    } else if (element.getAttribute("style") !== value) {
      element.setAttribute("style", value);
    }
  }
  function restoreAttributes(element, attributes) {
    const baseline = new Map(attributes);
    for (const name of OWNED_ATTRIBUTES) {
      if (name === "class") {
        restoreClassName(element, baseline.get(name) ?? null);
        continue;
      }
      if (name === "style") {
        restoreStyle(element, baseline.get(name) ?? null);
        continue;
      }
      if (!baseline.has(name)) {
        element.removeAttribute(name);
        continue;
      }
      const value = baseline.get(name);
      if (element.getAttribute(name) !== value) element.setAttribute(name, value);
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
        if (element instanceof HTMLProgressElement) {
          for (const name of ["max", "value"]) {
            if (originalAttribute(snapshot, name) === null) element.removeAttribute(name);
          }
        }
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

  // src/input.js
  function createInputController({
    root,
    options,
    isActive,
    isMoving,
    currentHorizon,
    move,
    moveWithinHorizon,
    moveToBoundary
  }) {
    let attached = false;
    let wheelAccumulator = 0;
    let wheelDirection = 0;
    let wheelGestureLocked = false;
    let lastWheelAt = 0;
    let lastNativeScrollAt = 0;
    let wheelResetTimer = 0;
    let wheelUnlockTimer = 0;
    let pointer = null;
    let touch = null;
    let multiTouch = false;
    function scheduleWheelUnlock() {
      clearTimeout(wheelUnlockTimer);
      const elapsed = performance.now() - lastWheelAt;
      const delay = Math.max(0, options.wheelIdle - elapsed);
      wheelUnlockTimer = setTimeout(() => {
        if (isMoving()) {
          scheduleWheelUnlock();
          return;
        }
        if (performance.now() - lastWheelAt < options.wheelIdle) {
          scheduleWheelUnlock();
          return;
        }
        wheelGestureLocked = false;
        wheelDirection = 0;
      }, delay);
    }
    function onWheel(event) {
      if (!isActive() || event.ctrlKey || closestWithin(root, event.target, "[fs-ignore]")) return;
      const delta = normalizeWheelDelta(event);
      const direction = Math.sign(delta);
      if (!direction) return;
      const now = performance.now();
      if (closestWithin(root, event.target, WHEEL_INTERACTIVE_SELECTOR)) return;
      const scrollAreas = getScrollAreas(root, event.target);
      if (canAnyScroll(scrollAreas, direction)) {
        lastNativeScrollAt = now;
        wheelAccumulator = 0;
        return;
      }
      event.preventDefault();
      lastWheelAt = now;
      if (scrollAreas.length > 0 && now - lastNativeScrollAt < options.wheelIdle) return;
      if (wheelGestureLocked || isMoving()) {
        scheduleWheelUnlock();
        return;
      }
      if (wheelDirection !== direction) {
        wheelAccumulator = 0;
        wheelDirection = direction;
      }
      wheelAccumulator += delta;
      clearTimeout(wheelResetTimer);
      wheelResetTimer = setTimeout(() => {
        wheelAccumulator = 0;
        wheelDirection = 0;
      }, options.wheelIdle);
      if (Math.abs(wheelAccumulator) < options.wheelThreshold) return;
      wheelAccumulator = 0;
      wheelGestureLocked = true;
      Promise.resolve(move(direction, "wheel")).finally(scheduleWheelUnlock);
    }
    function ownsKeyboardTarget(target) {
      if (!(target instanceof Element)) return true;
      if (target === document.body || target === document.documentElement) return true;
      return target === root || root.contains(target);
    }
    function onKeyDown(event) {
      if (!isActive() || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (!ownsKeyboardTarget(event.target)) return;
      if (event.target instanceof Element && (event.target.matches(INTERACTIVE_SELECTOR) || closestWithin(root, event.target, "[fs-ignore]"))) {
        return;
      }
      let action = null;
      if (["ArrowDown", "PageDown"].includes(event.key) || event.code === "Space" && !event.shiftKey) {
        action = () => move(1, "keyboard");
      } else if (["ArrowUp", "PageUp"].includes(event.key) || event.code === "Space" && event.shiftKey) {
        action = () => move(-1, "keyboard");
      } else if (event.key === "ArrowRight") {
        action = () => moveWithinHorizon(1, "keyboard");
      } else if (event.key === "ArrowLeft") {
        action = () => moveWithinHorizon(-1, "keyboard");
      } else if (event.key === "Home") {
        action = () => moveToBoundary("first", "keyboard");
      } else if (event.key === "End") {
        action = () => moveToBoundary("last", "keyboard");
      }
      if (action && action() !== false) event.preventDefault();
    }
    function startGesture(event, point, id) {
      const scrollAreas = getScrollAreas(root, event.target);
      return {
        id,
        x: point.clientX,
        y: point.clientY,
        scrollAreas,
        scrollSnapshot: captureScrollGesture(scrollAreas)
      };
    }
    function finishGesture(gesture, clientX, clientY) {
      const result = readGesture(gesture, clientX, clientY, options.touchThreshold);
      if (!result) return;
      const { direction, vertical } = result;
      if (vertical && gesture.scrollAreas.length > 0 && (scrollGestureWasConsumed(gesture.scrollSnapshot) || canAnyScroll(gesture.scrollAreas, direction))) {
        return;
      }
      if (!vertical && currentHorizon()?.only) {
        moveWithinHorizon(direction, "touch");
        return;
      }
      move(direction, "touch");
    }
    function onPointerDown(event) {
      if (!isActive() || event.pointerType === "mouse" || event.pointerType === "touch" || !event.isPrimary || closestWithin(root, event.target, "[fs-ignore]") || event.target instanceof Element && event.target.matches(INTERACTIVE_SELECTOR)) {
        return;
      }
      pointer = startGesture(event, event, event.pointerId);
    }
    function onPointerUp(event) {
      if (!pointer || pointer.id !== event.pointerId || isMoving()) {
        pointer = null;
        return;
      }
      const gesture = pointer;
      pointer = null;
      finishGesture(gesture, event.clientX, event.clientY);
    }
    function onTouchStart(event) {
      if (!isActive() || closestWithin(root, event.target, "[fs-ignore]") || event.target instanceof Element && event.target.matches(INTERACTIVE_SELECTOR)) {
        return;
      }
      if (event.touches.length > 1) {
        multiTouch = true;
        touch = null;
        return;
      }
      const point = event.changedTouches[0];
      if (point) touch = startGesture(event, point, point.identifier);
    }
    function onTouchEnd(event) {
      if (event.touches.length > 0) {
        touch = null;
        return;
      }
      const wasMultiTouch = multiTouch;
      multiTouch = false;
      if (wasMultiTouch || !touch || isMoving()) {
        touch = null;
        return;
      }
      const point = Array.from(event.changedTouches).find((item) => item.identifier === touch.id);
      if (!point) return;
      const gesture = touch;
      touch = null;
      finishGesture(gesture, point.clientX, point.clientY);
    }
    function clearGestures() {
      pointer = null;
      touch = null;
      multiTouch = false;
    }
    function attach() {
      if (attached) return;
      attached = true;
      root.addEventListener("wheel", onWheel, { passive: false });
      root.addEventListener("pointerdown", onPointerDown, { passive: true });
      root.addEventListener("pointerup", onPointerUp, { passive: true });
      root.addEventListener("pointercancel", clearGestures, { passive: true });
      root.addEventListener("touchstart", onTouchStart, { passive: true });
      root.addEventListener("touchend", onTouchEnd, { passive: true });
      root.addEventListener("touchcancel", clearGestures, { passive: true });
      document.addEventListener("keydown", onKeyDown);
    }
    function detach() {
      if (attached) {
        attached = false;
        root.removeEventListener("wheel", onWheel);
        root.removeEventListener("pointerdown", onPointerDown);
        root.removeEventListener("pointerup", onPointerUp);
        root.removeEventListener("pointercancel", clearGestures);
        root.removeEventListener("touchstart", onTouchStart);
        root.removeEventListener("touchend", onTouchEnd);
        root.removeEventListener("touchcancel", clearGestures);
        document.removeEventListener("keydown", onKeyDown);
      }
      clearTimeout(wheelResetTimer);
      clearTimeout(wheelUnlockTimer);
      wheelAccumulator = 0;
      wheelDirection = 0;
      wheelGestureLocked = false;
      clearGestures();
    }
    return Object.freeze({ attach, detach, scheduleWheelUnlock });
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
          limitProgress: 1,
          prev: { translate: [0, 0, -520], scale: 0.88, opacity: 0.14 },
          next: { translate: translate(direction, "94%", -80), scale: 0.98, opacity: 0 }
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
  var STEP_REENTRIES2 = /* @__PURE__ */ new Set(["preserve", "first", "last"]);
  function readEffect(element, warn) {
    const effect = element.getAttribute("fs-effect")?.trim().toLowerCase() || null;
    if (!effect) return null;
    if (isEffectName(effect)) return effect;
    warn(`[fs-effect]\uB294 ${EFFECT_NAMES.join(", ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
    return null;
  }
  function readFlowSettings(element, warn, { allowRelations = true, allowFooter = false } = {}) {
    const flow = element.hasAttribute("fs-flow");
    const settings = {
      flow,
      flowFooter: false,
      flowEnterSide: null,
      flowExitSide: null
    };
    const rawValue = element.getAttribute("fs-flow")?.trim().toLowerCase() || "";
    if (!rawValue) return settings;
    if (rawValue === "footer") {
      if (allowFooter) {
        settings.flowFooter = true;
      } else {
        settings.flow = false;
        warn('fs-flow="footer"\uB294 [fs]\uC758 \uB9C8\uC9C0\uB9C9 \uC138\uB85C \uD398\uC774\uC9C0\uC5D0\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.');
      }
      return settings;
    }
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
      if (!STEP_REENTRIES2.has(rawReentry)) {
        warn("fs-step-reentry\uB294 preserve, first, last \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
      } else {
        settings.stepReentry = rawReentry;
      }
    }
    return settings;
  }
  function createRoute({ routes, page, pageIndex, pageCount, slide = null, slideIndex = null, anchor, horizon, warn }) {
    const flow = readFlowSettings(slide ?? page, warn, {
      allowRelations: slide !== null,
      allowFooter: slide === null && pageIndex === pageCount - 1
    });
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
      const { slides, overlays } = page.hasAttribute("fs-horizon") ? getDirectHorizonChildren(page) : { slides: [], overlays: [] };
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
        routes.push(createRoute({ routes, page, pageIndex, pageCount: pages.length, anchor, warn }));
        return;
      }
      const horizon = {
        page,
        pageIndex,
        slides,
        overlays,
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
        const route = createRoute({ routes, page, pageIndex, pageCount: pages.length, slide, slideIndex, anchor, horizon, warn });
        routes.push(route);
        horizon.routes.push(route);
      });
    });
    return { pages, routes, anchorMap, horizons };
  }
  function routeIndexFromHash(hash, anchorMap, routes) {
    const rawHash = hash.replace(/^#/, "");
    if (!rawHash) return null;
    const separator = rawHash.indexOf("/");
    const rawAnchor = separator === -1 ? rawHash : rawHash.slice(0, separator);
    const rawSlide = separator === -1 ? "" : rawHash.slice(separator + 1);
    if (rawSlide.includes("/")) return null;
    let anchor;
    try {
      anchor = decodeURIComponent(rawAnchor);
    } catch {
      return null;
    }
    const pageIndex = anchorMap.get(anchor);
    if (pageIndex === void 0) return null;
    const candidates = routes.filter((route) => route.pageIndex === pageIndex);
    if (separator !== -1 && !/^[1-9]\d*$/.test(rawSlide)) return null;
    const slideIndex = rawSlide ? clamp(Number(rawSlide) - 1, 0, candidates.length - 1) : 0;
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
      flowFooter: route.flowFooter,
      flowEnterSide: route.flowEnterSide,
      flowExitSide: route.flowExitSide,
      horizonOnly: route.horizonOnly,
      horizonFirst: route.horizonFirst,
      stepMax: route.stepMax,
      stepReentry: route.stepReentry
    });
  }

  // src/location.js
  function createLocationController({
    history,
    getAnchorMap,
    getRoutes,
    getCurrentIndex,
    isDestroyed,
    isMoving,
    isActive,
    moveTo
  }) {
    let started = false;
    let pendingIndex = null;
    let syncing = false;
    function resolve(hash) {
      return routeIndexFromHash(hash, getAnchorMap(), getRoutes());
    }
    function read() {
      return resolve(window.location.hash);
    }
    async function flush() {
      if (isDestroyed() || syncing || isMoving()) return;
      syncing = true;
      try {
        while (pendingIndex !== null && !isDestroyed()) {
          const routeIndex = pendingIndex;
          pendingIndex = null;
          if (routeIndex === getCurrentIndex()) continue;
          await moveTo(routeIndex, {
            trigger: "history",
            updateHistory: false,
            instant: !isActive()
          });
        }
      } finally {
        syncing = false;
        if (pendingIndex !== null && !isMoving() && !isDestroyed()) {
          queueMicrotask(flush);
        }
      }
    }
    function onChange() {
      const routeIndex = read() ?? (window.location.hash ? null : 0);
      if (routeIndex === null) return;
      pendingIndex = routeIndex;
      flush();
    }
    function write(route) {
      if (!history || !route?.anchor || !window.history?.pushState) return;
      const hash = hashForRoute(route);
      if (window.location.hash === hash) return;
      window.history.pushState(window.history.state, "", hash);
    }
    function start() {
      if (started) return;
      started = true;
      window.addEventListener("popstate", onChange);
      window.addEventListener("hashchange", onChange);
    }
    function stop() {
      if (started) {
        started = false;
        window.removeEventListener("popstate", onChange);
        window.removeEventListener("hashchange", onChange);
      }
      pendingIndex = null;
    }
    return Object.freeze({ flush, onChange, read, resolve, start, stop, write });
  }

  // src/navigation.js
  function createNavigation({ root, pages, routes, horizons, labels, onNavigate }) {
    const generatedNodes = [];
    const verticalNav = document.createElement("nav");
    verticalNav.className = "fs-nav fs-nav-vertical";
    verticalNav.setAttribute("fs-ignore", "");
    verticalNav.setAttribute("aria-label", formatLabel(labels.navigation));
    pages.forEach((page, pageIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fs-dot";
      button.setAttribute(
        "aria-label",
        formatLabel(labels.page, { index: pageIndex + 1, total: pages.length })
      );
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
      nav.setAttribute(
        "aria-label",
        formatLabel(labels.horizonNavigation, { index: horizon.pageIndex + 1 })
      );
      horizon.slides.forEach((slide, slideIndex) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fs-dot";
        button.setAttribute(
          "aria-label",
          formatLabel(labels.horizonPage, { index: slideIndex + 1, total: horizon.slides.length })
        );
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

  // src/responsive.js
  function closestRouteToViewport(routes, currentIndex) {
    let bestIndex = clamp(currentIndex, 0, routes.length - 1);
    let bestDistance = Number.POSITIVE_INFINITY;
    routes.forEach((route, index) => {
      const element = route.slide ?? route.page;
      const distance = Math.abs(element.getBoundingClientRect().top);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }
  function scrollRouteIntoView(route, smooth) {
    const element = route?.slide ?? route?.page;
    element?.scrollIntoView?.({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }
  function createResponsiveController({
    breakpoint,
    isDestroyed,
    isDisabled,
    isResponsive,
    isActive,
    isMoving,
    onEnter,
    onExit,
    onResize
  }) {
    let started = false;
    let resizeTimer = 0;
    function matches() {
      return breakpoint > 0 && window.innerWidth <= breakpoint;
    }
    function refresh() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isDestroyed() || isDisabled()) return;
        if (isMoving()) {
          refresh();
          return;
        }
        const shouldRespond = matches();
        if (shouldRespond && !isResponsive()) onEnter();
        else if (!shouldRespond && isResponsive()) onExit();
        else if (isActive()) onResize();
      }, 120);
    }
    function start() {
      if (started) return;
      started = true;
      window.addEventListener("resize", refresh, { passive: true });
      window.addEventListener("orientationchange", refresh, { passive: true });
    }
    function stop() {
      if (started) {
        started = false;
        window.removeEventListener("resize", refresh);
        window.removeEventListener("orientationchange", refresh);
      }
      clearTimeout(resizeTimer);
    }
    return Object.freeze({ matches, refresh, start, stop });
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
  var VIMEO_HOSTS = /* @__PURE__ */ new Set(["player.vimeo.com"]);
  var YOUTUBE_HOSTS = /* @__PURE__ */ new Set([
    "youtube.com",
    "www.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
    "youtu.be"
  ]);
  function iframeCommand(iframe, command) {
    const source = iframe.getAttribute("src") || "";
    if (!source) return;
    let url;
    try {
      url = new URL(source, document.baseURI);
    } catch {
      return;
    }
    if (VIMEO_HOSTS.has(url.hostname)) {
      iframe.contentWindow?.postMessage({ method: command }, url.origin);
      return;
    }
    if (YOUTUBE_HOSTS.has(url.hostname)) {
      iframe.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: command === "play" ? "playVideo" : "pauseVideo",
          args: []
        }),
        url.origin
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

  // src/route-state.js
  function createRouteState({ root, stepReentry, themeTarget, getSnapshots, warn }) {
    const stepStates = /* @__PURE__ */ new WeakMap();
    const themeSnapshots = /* @__PURE__ */ new Map();
    let themeTargets = [];
    let stepElement = null;
    let activeMediaElement = null;
    function setupThemeTargets() {
      restoreThemeTargets();
      if (!themeTarget) return;
      if (typeof themeTarget !== "string") {
        warn("themeTarget\uC740 \uD5E4\uB354 \uC694\uC18C\uB97C \uCC3E\uB294 CSS \uC120\uD0DD\uC790 \uBB38\uC790\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
        return;
      }
      try {
        themeTargets = Array.from(document.querySelectorAll(themeTarget));
      } catch {
        warn(`themeTarget \uC120\uD0DD\uC790\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4: ${themeTarget}`);
        return;
      }
      themeTargets.forEach((target) => {
        themeSnapshots.set(target, target.getAttribute("fs-theme"));
      });
    }
    function restoreThemeTargets() {
      themeSnapshots.forEach((theme, target) => {
        if (theme === null) target.removeAttribute("fs-theme");
        else target.setAttribute("fs-theme", theme);
      });
      themeTargets = [];
      themeSnapshots.clear();
    }
    function stepInfo(route) {
      if (!route?.stepElement || route.stepMax < 2) return null;
      const current = clamp(stepStates.get(route.stepElement) ?? 1, 1, route.stepMax);
      return {
        element: route.stepElement,
        current,
        max: route.stepMax,
        reentry: route.stepReentry ?? stepReentry
      };
    }
    function applyStepEntry(destination, origin) {
      const step = stepInfo(destination);
      if (!step || step.element === origin?.stepElement) return;
      if (step.reentry === "first") stepStates.set(step.element, 1);
      else if (step.reentry === "last") stepStates.set(step.element, step.max);
      else if (!stepStates.has(step.element)) stepStates.set(step.element, 1);
    }
    function setStep(element, value) {
      stepStates.set(element, value);
    }
    function syncStep(route) {
      if (stepElement && stepElement !== route.stepElement) {
        stepElement.removeAttribute("fs-step-current");
      }
      const step = stepInfo(route);
      stepElement = step?.element ?? null;
      if (step) step.element.setAttribute("fs-step-current", String(step.current));
    }
    function syncMedia(route) {
      const nextElement = route?.mediaElement ?? null;
      if (nextElement === activeMediaElement) return;
      pauseRouteMedia(activeMediaElement);
      activeMediaElement = nextElement;
      playRouteMedia(nextElement);
    }
    function syncTheme(route) {
      const theme = route.slide?.getAttribute("fs-theme") ?? route.page.getAttribute("fs-theme");
      const targets = [root, ...themeTargets];
      targets.forEach((target) => {
        if (theme !== null) {
          target.setAttribute("fs-theme", theme);
        } else if (target === root) {
          target.removeAttribute("fs-theme");
        } else {
          const originalTheme = themeSnapshots.get(target);
          if (originalTheme === null) target.removeAttribute("fs-theme");
          else target.setAttribute("fs-theme", originalTheme);
        }
      });
    }
    function setRuntimeInert(element, inactive) {
      const original = getSnapshots().get(element)?.some(([name]) => name === "inert");
      if (inactive || original) element.setAttribute("inert", "");
      else element.removeAttribute("inert");
    }
    function syncAccessibility(route, pages, horizons, flowView) {
      const visibleSlides = /* @__PURE__ */ new Set([route.slide]);
      if (flowView?.pageIndex === route.pageIndex && flowView.companion) {
        visibleSlides.add(flowView.companion);
      }
      if (flowView?.pageIndex === route.pageIndex && flowView.flowSlide) {
        visibleSlides.add(flowView.flowSlide);
      }
      const viewport = root.getBoundingClientRect?.();
      const hasViewport = Boolean(viewport?.height);
      for (const page of pages) {
        const bounds = page.getBoundingClientRect?.();
        const intersectsViewport = hasViewport && route.flow && bounds && bounds.bottom > viewport.top + 1 && bounds.top < viewport.bottom - 1;
        setRuntimeInert(page, page !== route.page && !intersectsViewport);
      }
      for (const horizon of horizons.values()) {
        for (const slide of horizon.slides) {
          const inactive = horizon.page !== route.page || !visibleSlides.has(slide);
          setRuntimeInert(slide, inactive);
        }
      }
    }
    function sync(route, pages, horizons, flowView) {
      syncStep(route);
      syncTheme(route);
      syncMedia(route);
      syncAccessibility(route, pages, horizons, flowView);
    }
    function destroy() {
      syncMedia(null);
      restoreThemeTargets();
      stepElement?.removeAttribute("fs-step-current");
      stepElement = null;
    }
    return Object.freeze({
      applyStepEntry,
      destroy,
      setStep,
      setupThemeTargets,
      stepInfo,
      sync,
      syncMedia
    });
  }

  // src/runtime.js
  function createRuntime(root, routes) {
    return {
      rootWrapper: document.createElement("div"),
      rootMarkers: /* @__PURE__ */ new Map(),
      horizons: [],
      footerRoute: routes.find((route) => route.flowFooter) ?? null,
      footerStage: null,
      rootViewport: root,
      rootEffect: "slide"
    };
  }
  function mountRootStructure({ root, pages, runtime }) {
    runtime.rootWrapper.className = "swiper-wrapper fs-vertical-wrapper";
    const firstPage = pages[0];
    if (runtime.footerRoute) {
      runtime.footerStage = document.createElement("div");
      runtime.footerStage.className = "fs-footer-stage";
      runtime.rootViewport = document.createElement("div");
      runtime.rootViewport.className = "swiper fs-effect-viewport";
      runtime.rootViewport.append(runtime.rootWrapper);
      runtime.footerStage.append(runtime.rootViewport);
      root.insertBefore(runtime.footerStage, firstPage);
    } else {
      root.insertBefore(runtime.rootWrapper, firstPage);
    }
    for (const page of pages) {
      const marker = document.createComment("fullscroll-page");
      root.insertBefore(marker, page);
      runtime.rootMarkers.set(page, marker);
      if (page === runtime.footerRoute?.page) {
        runtime.footerStage.append(page);
      } else {
        page.classList.add("swiper-slide");
        runtime.rootWrapper.append(page);
      }
    }
  }
  function markFlowRoutes(routes) {
    for (const route of routes) {
      if (route.flow && !route.flowFooter) {
        (route.slide ?? route.page).setAttribute("fs-flow-active", "");
      }
    }
  }
  function mountHorizon({ horizon, currentRoute, horizontalEffect, Swiper, options }) {
    const wrapper = document.createElement("div");
    wrapper.className = "swiper-wrapper fs-horizon-wrapper";
    horizon.wrapper = wrapper;
    horizon.markers = /* @__PURE__ */ new Map();
    horizon.page.insertBefore(wrapper, horizon.slides[0]);
    for (const slide of horizon.slides) {
      const marker = document.createComment("fullscroll-slide");
      horizon.page.insertBefore(marker, slide);
      horizon.markers.set(slide, marker);
      slide.classList.add("swiper-slide");
      wrapper.append(slide);
    }
    horizon.page.classList.add("swiper", "fs-horizon-runtime");
    const hasFlowSlide = horizon.routes.some((route) => route.flow);
    const effect = hasFlowSlide ? "slide" : horizon.effect ?? horizontalEffect;
    horizon.runtimeEffect = effect;
    horizon.page.setAttribute("fs-effect-active", effect);
    const initialSlide = currentRoute.pageIndex === horizon.pageIndex && currentRoute.slideIndex !== null ? currentRoute.slideIndex : 0;
    horizon.swiper = new Swiper(horizon.page, {
      ...options.horizontalSwiper,
      ...effectOptions(effect, "horizontal"),
      direction: "horizontal",
      slidesPerView: hasFlowSlide ? "auto" : 1,
      ...hasFlowSlide ? { slidesPerGroup: 1, slidesPerGroupAuto: false } : {},
      initialSlide,
      speed: options.speed,
      allowTouchMove: false,
      simulateTouch: false,
      nested: true,
      mousewheel: false,
      keyboard: false,
      observer: false,
      observeParents: false
    });
  }
  function mountRootSwiper({ runtime, currentRoute, rootEffect, hasFlowPage, Swiper, options }) {
    runtime.rootEffect = hasFlowPage ? "slide" : rootEffect;
    const initialPageIndex = runtime.footerRoute && currentRoute.flowFooter ? runtime.footerRoute.pageIndex - 1 : currentRoute.pageIndex;
    return new Swiper(runtime.rootViewport, {
      ...options.verticalSwiper,
      ...effectOptions(runtime.rootEffect, "vertical"),
      direction: "vertical",
      slidesPerView: hasFlowPage ? "auto" : 1,
      ...hasFlowPage ? { slidesPerGroup: 1, slidesPerGroupAuto: false } : {},
      initialSlide: initialPageIndex,
      speed: options.speed,
      allowTouchMove: false,
      simulateTouch: false,
      mousewheel: false,
      keyboard: false,
      observer: false,
      observeParents: false
    });
  }
  function mountRuntime({
    root,
    pages,
    routes,
    horizons,
    currentRoute,
    Swiper,
    options,
    readEffect: readEffect2,
    warn
  }) {
    const runtime = createRuntime(root, routes);
    let rootSwiper = null;
    markFlowRoutes(routes);
    mountRootStructure({ root, pages, runtime });
    root.classList.add("fs-root");
    if (!runtime.footerRoute) root.classList.add("swiper");
    root.style.setProperty("--fs-speed", `${options.speed}ms`);
    root.style.setProperty("--fs-easing", options.easing);
    root.setAttribute("fs-ready", "");
    const hasFlowPage = routes.some(
      (route) => route.slideIndex === null && route.flow && !route.flowFooter
    );
    const rootAttributeEffect = root.getAttribute("fs-effect");
    const rootEffect = readEffect2(
      rootAttributeEffect,
      options.effect ?? options.verticalSwiper.effect
    );
    const horizontalEffect = readEffect2(
      rootAttributeEffect,
      options.effect ?? options.horizontalSwiper.effect
    );
    let flowView = null;
    try {
      for (const horizon of horizons.values()) {
        runtime.horizons.push(horizon);
        mountHorizon({ horizon, currentRoute, horizontalEffect, Swiper, options });
      }
      rootSwiper = mountRootSwiper({
        runtime,
        currentRoute,
        rootEffect,
        hasFlowPage,
        Swiper,
        options
      });
      root.setAttribute("fs-effect-active", runtime.rootEffect);
      if (currentRoute.slideIndex !== null) {
        const horizon = horizons.get(currentRoute.pageIndex);
        flowView = resolveFlowView({ horizon, destination: currentRoute });
        if (flowView) {
          horizon.swiper.translateTo?.(-flowView.offset, 0, false, false);
        }
      }
    } catch (error) {
      unmountRuntime({ root, runtime, rootSwiper, warn });
      throw error;
    }
    return { runtime, rootSwiper, flowView };
  }
  function destroySwiper(swiper, label, warn) {
    try {
      swiper?.destroy?.(true, true);
    } catch (error) {
      warn(`${label} Swiper \uC81C\uAC70 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error.message}`);
    }
  }
  function restoreHorizon(horizon) {
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
    horizon.wrapper = null;
    horizon.markers = null;
    horizon.swiper = null;
    horizon.runtimeEffect = null;
  }
  function restoreRoot(root, runtime) {
    for (const [page, marker] of runtime.rootMarkers) {
      if ((page.parentNode === runtime.rootWrapper || page.parentNode === runtime.footerStage) && marker.parentNode === root) {
        root.insertBefore(page, marker);
      }
      marker.remove();
    }
    if (runtime.footerStage?.parentNode) {
      runtime.footerStage.remove();
    } else if (runtime.rootWrapper?.parentNode) {
      const remainingNodes = Array.from(runtime.rootWrapper.childNodes);
      runtime.rootWrapper.remove();
      root.append(...remainingNodes);
    }
  }
  function unmountRuntime({ root, runtime, rootSwiper, warn }) {
    if (!runtime) return;
    destroySwiper(rootSwiper, "\uC138\uB85C", warn);
    for (const horizon of runtime.horizons) {
      destroySwiper(horizon.swiper, "\uAC00\uB85C", warn);
    }
    for (const horizon of runtime.horizons) {
      restoreHorizon(horizon);
    }
    restoreRoot(root, runtime);
  }

  // src/transitions.js
  function waitForSwiper(swiper, duration, start) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(fallback);
        swiper.off?.("transitionEnd", finish);
        callback(value);
      };
      const finish = () => settle(resolve);
      const fallback = setTimeout(finish, duration + 180);
      try {
        swiper.once?.("transitionEnd", finish);
        start();
      } catch (error) {
        settle(reject, error);
      }
    });
  }
  function transitionToIndex(swiper, index, duration, flowOffset = null) {
    if (!swiper) return Promise.resolve();
    if (flowOffset !== null && typeof swiper.translateTo === "function") {
      swiper.slideTo(index, 0, false);
      return transitionToOffset(swiper, flowOffset, duration);
    }
    if (duration === 0 || swiper.activeIndex === index) {
      swiper.slideTo(index, 0, false);
      return Promise.resolve();
    }
    return waitForSwiper(swiper, duration, () => swiper.slideTo(index, duration, true));
  }
  function transitionToOffset(swiper, offset, duration) {
    const translate2 = -offset;
    if (duration === 0) {
      swiper.translateTo(translate2, 0, false, false);
      return Promise.resolve();
    }
    return waitForSwiper(
      swiper,
      duration,
      () => swiper.translateTo(translate2, duration, true, false)
    );
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
        move: (direction, trigger) => direction > 0 ? this.next({ trigger }) : this.prev({ trigger }),
        moveWithinHorizon: (direction, trigger) => direction > 0 ? this.nextWithinHorizon(trigger) : this.prevWithinHorizon(trigger),
        moveToBoundary: (boundary, trigger) => this.goToRoute(boundary === "first" ? 0 : this.routes.length - 1, { trigger })
      });
      this.location = createLocationController({
        history: this.options.history,
        getAnchorMap: () => this.anchorMap,
        getRoutes: () => this.routes,
        getCurrentIndex: () => this.currentIndex,
        isDestroyed: () => this.destroyed,
        isMoving: () => this.moving,
        isActive: () => this.active,
        moveTo: (routeIndex, moveOptions) => this.goToRoute(routeIndex, moveOptions)
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
        onResize: () => this.resizeRuntime()
      });
      this.routeState = createRouteState({
        root: this.root,
        stepReentry: this.options.stepReentry,
        themeTarget: this.options.themeTarget,
        getSnapshots: () => this.snapshots,
        warn: (message) => this.warn(message)
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
          this.root.setAttribute("fs-responsive", "");
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
        routes: Object.freeze(this.routes.map((route) => this.publicRoute(route)))
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
          const rawReference = reference.replace(/^#/, "");
          try {
            const exactAnchor = decodeURIComponent(rawReference);
            const pageIndex = this.anchorMap.get(exactAnchor);
            if (pageIndex !== void 0) return this.firstRouteIndexForPage(pageIndex);
          } catch {
            return null;
          }
          const hash = `#${rawReference}`;
          return this.location.resolve(hash);
        },
        onPrev: () => this.prev({ trigger: "control" }),
        onNext: () => this.next({ trigger: "control" }),
        onMove: (routeIndex) => this.goToRoute(routeIndex, { trigger: "control" }),
        warn: (message) => this.warn(message)
      });
    }
    syncControls() {
      this.controls?.sync({
        active: this.active && !this.responsive && !this.manualDisabled,
        currentIndex: this.currentIndex,
        total: this.routes.length
      });
    }
    installGlobalListeners() {
      this.location.start();
      this.viewport.start();
      window.addEventListener("pageshow", this.onPageShow);
    }
    removeGlobalListeners() {
      this.location.stop();
      this.viewport.stop();
      window.removeEventListener("pageshow", this.onPageShow);
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
          warn: (message) => this.warn(message)
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
        this.emit("ready", { current: this.publicRoute(currentRoute) });
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
        warn: (message) => this.warn(message)
      });
      this.restoreSnapshots();
      this.rootSwiper = null;
      this.runtime = null;
      this.active = false;
      this.moving = false;
      this.flowView = null;
      this.routeState.syncMedia(null);
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
        scrollRouteIntoView(this.routes[nextIndex], true);
        if (updateHistory) {
          this.location.write(this.routes[nextIndex]);
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
      this.emit("transitionstart", detail);
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
        this.emit("change", detail);
        changed = true;
        return true;
      } catch (error) {
        if (!this.destroyed && this.active && transitionVersion === this.transitionVersion) {
          try {
            this.settleRuntimeRoute(origin);
            this.syncState();
          } catch (restoreError) {
            this.warn(`\uC2E4\uD328\uD55C \uC774\uB3D9\uC744 \uBCF5\uAD6C\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${restoreError.message}`);
          }
        }
        throw error;
      } finally {
        if (!changed) {
          this.emit("transitioncancel", detail);
        }
        this.moving = false;
        this.root.removeAttribute("fs-moving");
        this.root.removeAttribute("fs-direction");
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
            this.transitionFooterStage(true, duration)
          ]);
        }
        if (this.routes[this.currentIndex]?.flowFooter) {
          return Promise.all([
            transitionToIndex(this.rootSwiper, route.pageIndex, duration),
            this.transitionFooterStage(false, duration)
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
          if (event && (event.target !== stage || event.propertyName !== "transform")) return;
          if (settled) return;
          settled = true;
          clearTimeout(fallback);
          stage.removeEventListener("transitionend", finish);
          resolve();
        };
        const fallback = setTimeout(finish, duration + 180);
        stage.addEventListener("transitionend", finish);
        requestAnimationFrame(() => this.setFooterStageOffset(show, duration));
      });
    }
    next(options = {}) {
      const step = this.active ? this.currentStepInfo() : null;
      if (step && step.current < step.max) {
        return this.goToStep(step.current + 1, options);
      }
      return this.goToRoute(this.verticalTargetIndex("next"), options);
    }
    prev(options = {}) {
      const step = this.active ? this.currentStepInfo() : null;
      if (step && step.current > 1) {
        return this.goToStep(step.current - 1, options);
      }
      return this.goToRoute(this.verticalTargetIndex("prev"), options);
    }
    currentStepInfo(route = this.routes[this.currentIndex]) {
      return this.routeState.stepInfo(route);
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
      this.routeState.setStep(step.element, nextStep);
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
      this.emit("resize", { width: window.innerWidth, height: window.innerHeight });
    }
    disableForResponsive() {
      this.teardownRuntime();
      this.responsive = true;
      this.root.setAttribute("fs-responsive", "");
      scrollRouteIntoView(this.routes[this.currentIndex], false);
      this.syncControls();
      this.emit("responsive", {
        responsive: true,
        current: this.publicRoute(this.routes[this.currentIndex])
      });
    }
    enableFromResponsive() {
      this.currentIndex = closestRouteToViewport(this.routes, this.currentIndex);
      this.responsive = false;
      this.root.removeAttribute("fs-responsive");
      this.enableRuntime();
      this.syncControls();
      this.emit("responsive", {
        responsive: false,
        current: this.publicRoute(this.routes[this.currentIndex])
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
      this.routeState.sync(route, this.pages, this.horizons, this.flowView);
      syncNavigation(this.root, this.horizons, route);
      this.syncControls();
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
      if (this.viewport.matches()) {
        this.responsive = true;
        this.root.setAttribute("fs-responsive", "");
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
      this.emit("refresh", {
        active: this.active,
        responsive: this.responsive,
        current: this.publicRoute(this.routes[this.currentIndex])
      });
    }
    destroy() {
      if (this.destroyed) return;
      this.teardownRuntime();
      this.removeGlobalListeners();
      this.root.removeAttribute("fs-responsive");
      this.root.removeAttribute("fs-disabled");
      this.controls?.destroy();
      this.controls = null;
      this.routeState.destroy();
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
