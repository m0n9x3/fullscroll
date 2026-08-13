// src/gsap.js
var PREPARE_MODES = Object.freeze(["gsap", "css"]);
var INITIAL_PHASES = Object.freeze(["ready", "manual"]);
var ENTER_PHASES = Object.freeze(["transitionstart", "change"]);
var LEAVE_PHASES = Object.freeze(["transitionstart", "change", "none"]);
var REENTRY_POLICIES = Object.freeze(["always", "once", "preserve"]);
var DEFAULT_FROM = Object.freeze({ autoAlpha: 0, y: 32 });
var DEFAULT_TO = Object.freeze({
  autoAlpha: 1,
  y: 0,
  duration: 0.7,
  ease: "power3.out",
  stagger: 0.08
});
var DEFAULT_AT = Object.freeze({
  initial: "ready",
  enter: "change",
  leave: "transitionstart"
});
function isElement(value) {
  return typeof Element !== "undefined" && value instanceof Element;
}
function resolveTarget(target) {
  if (!target?.destroyed && target?.root && isElement(target.root) && Array.isArray(target.state?.routes)) {
    return { root: target.root, instance: target };
  }
  return { root: null, instance: null };
}
function routeTarget(route) {
  return route?.slide ?? route?.page ?? null;
}
function selectWithin(scope, selector) {
  if (!scope || !selector) return [];
  const elements = [];
  if (scope.matches?.(selector)) elements.push(scope);
  elements.push(...scope.querySelectorAll(selector));
  return elements;
}
function prefersReducedMotion() {
  return Boolean(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}
function pauseAtStart(animation) {
  if (typeof animation?.pause === "function") animation.pause(0);
  else animation?.progress?.(0);
}
function restart(animation) {
  if (typeof animation?.restart === "function") animation.restart(false);
  else animation?.play?.(0);
}
function playFromCurrent(animation) {
  if (typeof animation?.play === "function") animation.play();
  else animation?.restart?.(false);
}
function showImmediately(animation) {
  if (typeof animation?.progress === "function") animation.progress(1).pause?.();
  else animation?.play?.();
}
function reverse(animation) {
  animation?.reverse?.();
}
function animationProgress(animation) {
  const progress = animation?.progress?.();
  return typeof progress === "number" ? progress : 0;
}
function restoreProgress(animation, progress) {
  if (!animation || typeof animation.progress !== "function") return;
  animation.progress(progress).pause?.();
}
function checkRuntime(gsap) {
  const required = ["context", "fromTo", "to"];
  const missing = required.filter((name) => typeof gsap?.[name] !== "function");
  if (missing.length > 0) {
    throw new Error(`[FullScroll] GSAP \uB7F0\uD0C0\uC784\uC5D0 \uD544\uC694\uD55C \uD568\uC218\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4: ${missing.join(", ")}`);
  }
}
function requireValue(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label}\uC740 ${allowed.join(", ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
  }
}
function createAnimationSettings(animation, index) {
  if (!animation || typeof animation !== "object") {
    throw new Error(`animations[${index}]\uC740 \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
  }
  if (typeof animation.selector !== "string" || !animation.selector.trim()) {
    throw new Error(`animations[${index}].selector\uB294 CSS \uC120\uD0DD\uC790 \uBB38\uC790\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.`);
  }
  const prepare = animation.prepare ?? "gsap";
  const reentry = animation.reentry ?? "always";
  const at = { ...DEFAULT_AT, ...animation.at };
  requireValue(prepare, PREPARE_MODES, `animations[${index}].prepare`);
  requireValue(reentry, REENTRY_POLICIES, `animations[${index}].reentry`);
  requireValue(at.initial, INITIAL_PHASES, `animations[${index}].at.initial`);
  requireValue(at.enter, ENTER_PHASES, `animations[${index}].at.enter`);
  requireValue(at.leave, LEAVE_PHASES, `animations[${index}].at.leave`);
  if (animation.from != null && typeof animation.from !== "object") {
    throw new Error(`animations[${index}].from\uC740 GSAP vars \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
  }
  if (animation.to != null && typeof animation.to !== "object") {
    throw new Error(`animations[${index}].to\uB294 GSAP vars \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
  }
  return Object.freeze({
    selector: animation.selector,
    prepare,
    reentry,
    from: Object.freeze({ ...DEFAULT_FROM, ...animation.from }),
    to: Object.freeze({ ...DEFAULT_TO, ...animation.to }),
    at: Object.freeze(at)
  });
}
function createOptions(options = {}) {
  if (!Array.isArray(options.animations) || options.animations.length === 0) {
    throw new Error("animations\uC5D0\uB294 \uD558\uB098 \uC774\uC0C1\uC758 \uC560\uB2C8\uBA54\uC774\uC158 \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
  }
  if (options.respectReducedMotion != null && typeof options.respectReducedMotion !== "boolean") {
    throw new Error("respectReducedMotion\uC740 boolean\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
  }
  return Object.freeze({
    animations: Object.freeze(options.animations.map(createAnimationSettings)),
    respectReducedMotion: options.respectReducedMotion ?? true
  });
}
function resolvedToVars(settings, reducedMotion) {
  if (!reducedMotion) return { ...settings.to, paused: true };
  return {
    ...settings.to,
    duration: 0,
    delay: 0,
    stagger: 0,
    paused: true
  };
}
function createGroup({ gsap, target, settings, reducedMotion }) {
  const elements = selectWithin(target, settings.selector);
  let animation = null;
  const context = gsap.context(() => {
    if (elements.length === 0) return;
    const toVars = resolvedToVars(settings, reducedMotion);
    animation = settings.prepare === "gsap" ? gsap.fromTo(elements, { ...settings.from }, toVars) : gsap.to(elements, toVars);
  }, target);
  pauseAtStart(animation);
  return {
    settings,
    elements,
    animation,
    context,
    entered: false
  };
}
function createScene({ gsap, route, settings, reducedMotion }) {
  const target = routeTarget(route);
  if (!isElement(target)) return null;
  const groups = [];
  try {
    for (const animationSettings of settings) {
      groups.push(createGroup({ gsap, target, settings: animationSettings, reducedMotion }));
    }
    return { target, route, groups };
  } catch (error) {
    groups.forEach((group) => group.context?.revert?.());
    throw error;
  }
}
function playGroup(group) {
  if (!group?.animation) return;
  if (!group.entered) {
    group.entered = true;
    restart(group.animation);
  } else if (group.settings.reentry === "always") {
    restart(group.animation);
  } else if (group.settings.reentry === "once") {
    showImmediately(group.animation);
  } else {
    playFromCurrent(group.animation);
  }
}
function leaveGroup(group) {
  if (!group?.animation || !group.entered || group.settings.reentry === "preserve") return;
  reverse(group.animation);
}
function snapshotScene(scene) {
  if (!scene) return [];
  return scene.groups.map((group) => ({
    group,
    entered: group.entered,
    progress: animationProgress(group.animation)
  }));
}
function restoreScene(snapshot) {
  snapshot.forEach(({ group, entered, progress }) => {
    group.entered = entered;
    restoreProgress(group.animation, progress);
  });
}
function createGsapScenes(target, options = {}) {
  const { root, instance } = resolveTarget(target);
  if (!isElement(root)) {
    throw new Error("[FullScroll] GSAP \uC5F0\uB3D9\uC5D0\uB294 FullScroll \uC778\uC2A4\uD134\uC2A4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
  }
  const gsap = options.gsap;
  checkRuntime(gsap);
  const settings = createOptions(options);
  const scenes = /* @__PURE__ */ new Map();
  let destroyed = false;
  let manualStarted = false;
  let activeTransition = null;
  function reducedMotion() {
    return settings.respectReducedMotion && prefersReducedMotion();
  }
  function ensureScene(route) {
    const targetElement = routeTarget(route);
    if (!isElement(targetElement)) return null;
    let scene = scenes.get(targetElement);
    if (!scene) {
      scene = createScene({
        gsap,
        route,
        settings: settings.animations,
        reducedMotion: reducedMotion()
      });
      if (scene) scenes.set(targetElement, scene);
    } else {
      scene.route = route;
    }
    return scene;
  }
  function playInitial(scene) {
    if (!scene) return;
    scene.groups.forEach((group) => {
      if (group.settings.at.initial === "ready" || group.settings.at.initial === "manual" && manualStarted) {
        playGroup(group);
      }
    });
  }
  function playEnter(route, phase) {
    const scene = ensureScene(route);
    scene?.groups.forEach((group) => {
      if (group.settings.at.enter === phase) playGroup(group);
    });
  }
  function playLeave(route, phase) {
    const scene = scenes.get(routeTarget(route));
    scene?.groups.forEach((group) => {
      if (group.settings.at.leave === phase) leaveGroup(group);
    });
  }
  function prepareRoutes(current2) {
    if (destroyed || !current2) return;
    try {
      const currentScene = ensureScene(current2);
      instance.state.routes.forEach((route) => {
        if (routeTarget(route) !== routeTarget(current2)) ensureScene(route);
      });
      playInitial(currentScene);
    } catch (error) {
      clearScenes();
      throw error;
    }
  }
  function playCurrent() {
    if (destroyed || manualStarted) return;
    manualStarted = true;
    if (activeTransition || root.hasAttribute("fs-responsive")) return;
    const scene = ensureScene(instance.state.current);
    scene?.groups.forEach((group) => {
      if (group.settings.at.initial === "manual" && !group.entered) playGroup(group);
    });
  }
  function clearScenes() {
    activeTransition = null;
    scenes.forEach((scene) => {
      scene.groups.forEach((group) => group.context?.revert?.());
    });
    scenes.clear();
  }
  function onReady(event) {
    prepareRoutes(event.detail?.current);
  }
  function onTransitionStart(event) {
    const origin = event.detail?.origin;
    const destination = event.detail?.destination;
    if (!origin || !destination) return;
    if (activeTransition && routeTarget(activeTransition.origin) === routeTarget(origin) && routeTarget(activeTransition.destination) === routeTarget(destination)) {
      return;
    }
    if (activeTransition) {
      restoreScene(activeTransition.originSnapshot);
      restoreScene(activeTransition.destinationSnapshot);
    }
    const originScene = ensureScene(origin);
    const destinationScene = ensureScene(destination);
    activeTransition = {
      origin,
      destination,
      originSnapshot: snapshotScene(originScene),
      destinationSnapshot: snapshotScene(destinationScene)
    };
    playLeave(origin, "transitionstart");
    playEnter(destination, "transitionstart");
  }
  function onTransitionCancel() {
    if (!activeTransition) return;
    restoreScene(activeTransition.originSnapshot);
    restoreScene(activeTransition.destinationSnapshot);
    activeTransition = null;
  }
  function onChange(event) {
    const origin = event.detail?.origin;
    const destination = event.detail?.destination;
    if (!origin || !destination) return;
    playLeave(origin, "change");
    playEnter(destination, "change");
    activeTransition = null;
  }
  function onResponsive(event) {
    clearScenes();
    if (!event.detail?.responsive) prepareRoutes(event.detail?.current);
  }
  function onRefresh(event) {
    clearScenes();
    if (!event.detail?.responsive) prepareRoutes(event.detail?.current);
  }
  function onDestroy() {
    destroy();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    root.removeEventListener("fullscroll:ready", onReady);
    root.removeEventListener("fullscroll:transitionstart", onTransitionStart);
    root.removeEventListener("fullscroll:transitioncancel", onTransitionCancel);
    root.removeEventListener("fullscroll:change", onChange);
    root.removeEventListener("fullscroll:responsive", onResponsive);
    root.removeEventListener("fullscroll:refresh", onRefresh);
    root.removeEventListener("fullscroll:destroy", onDestroy);
    clearScenes();
  }
  const current = instance.state.current;
  if (current && !root.hasAttribute("fs-responsive")) {
    try {
      prepareRoutes(current);
    } catch (error) {
      destroyed = true;
      throw error;
    }
  }
  root.addEventListener("fullscroll:ready", onReady);
  root.addEventListener("fullscroll:transitionstart", onTransitionStart);
  root.addEventListener("fullscroll:transitioncancel", onTransitionCancel);
  root.addEventListener("fullscroll:change", onChange);
  root.addEventListener("fullscroll:responsive", onResponsive);
  root.addEventListener("fullscroll:refresh", onRefresh);
  root.addEventListener("fullscroll:destroy", onDestroy);
  return Object.freeze({
    root,
    playCurrent,
    refresh() {
      if (destroyed) return;
      clearScenes();
      if (!root.hasAttribute("fs-responsive")) prepareRoutes(instance.state.current);
    },
    destroy
  });
}
export {
  createGsapScenes
};
//# sourceMappingURL=gsap.esm.js.map
