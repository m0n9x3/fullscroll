const PREPARE_MODES = Object.freeze(['gsap', 'css']);
const INITIAL_PHASES = Object.freeze(['ready', 'manual']);
const ENTER_PHASES = Object.freeze(['transitionstart', 'change']);
const LEAVE_PHASES = Object.freeze(['transitionstart', 'change', 'none']);
const REENTRY_POLICIES = Object.freeze(['always', 'once', 'preserve']);

const DEFAULT_FROM = Object.freeze({ autoAlpha: 0, y: 32 });
const DEFAULT_TO = Object.freeze({
  autoAlpha: 1,
  y: 0,
  duration: 0.7,
  ease: 'power3.out',
  stagger: 0.08,
});
const DEFAULT_AT = Object.freeze({
  initial: 'ready',
  enter: 'change',
  leave: 'transitionstart',
});

function isElement(value) {
  return typeof Element !== 'undefined' && value instanceof Element;
}

function resolveTarget(target) {
  if (
    !target?.destroyed &&
    target?.root &&
    isElement(target.root) &&
    Array.isArray(target.state?.routes)
  ) {
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
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
}

function pauseAtStart(animation) {
  if (typeof animation?.pause === 'function') animation.pause(0);
  else animation?.progress?.(0);
}

function restart(animation) {
  if (typeof animation?.restart === 'function') animation.restart(false);
  else animation?.play?.(0);
}

function playFromCurrent(animation) {
  if (typeof animation?.play === 'function') animation.play();
  else animation?.restart?.(false);
}

function showImmediately(animation) {
  if (typeof animation?.progress === 'function') animation.progress(1).pause?.();
  else animation?.play?.();
}

function reverse(animation) {
  animation?.reverse?.();
}

function animationProgress(animation) {
  const progress = animation?.progress?.();
  return typeof progress === 'number' ? progress : 0;
}

function restoreProgress(animation, progress) {
  if (!animation || typeof animation.progress !== 'function') return;
  animation.progress(progress).pause?.();
}

function checkRuntime(gsap) {
  const required = ['context', 'fromTo', 'to'];
  const missing = required.filter((name) => typeof gsap?.[name] !== 'function');
  if (missing.length > 0) {
    throw new Error(`[FullScroll] GSAP 런타임에 필요한 함수가 없습니다: ${missing.join(', ')}`);
  }
}

function requireValue(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label}은 ${allowed.join(', ')} 중 하나여야 합니다.`);
  }
}

function createAnimationSettings(animation, index) {
  if (!animation || typeof animation !== 'object') {
    throw new Error(`animations[${index}]은 객체여야 합니다.`);
  }
  if (typeof animation.selector !== 'string' || !animation.selector.trim()) {
    throw new Error(`animations[${index}].selector는 CSS 선택자 문자열이어야 합니다.`);
  }

  const prepare = animation.prepare ?? 'gsap';
  const reentry = animation.reentry ?? 'always';
  const at = { ...DEFAULT_AT, ...animation.at };
  requireValue(prepare, PREPARE_MODES, `animations[${index}].prepare`);
  requireValue(reentry, REENTRY_POLICIES, `animations[${index}].reentry`);
  requireValue(at.initial, INITIAL_PHASES, `animations[${index}].at.initial`);
  requireValue(at.enter, ENTER_PHASES, `animations[${index}].at.enter`);
  requireValue(at.leave, LEAVE_PHASES, `animations[${index}].at.leave`);

  if (animation.from != null && typeof animation.from !== 'object') {
    throw new Error(`animations[${index}].from은 GSAP vars 객체여야 합니다.`);
  }
  if (animation.to != null && typeof animation.to !== 'object') {
    throw new Error(`animations[${index}].to는 GSAP vars 객체여야 합니다.`);
  }

  return Object.freeze({
    selector: animation.selector,
    prepare,
    reentry,
    from: Object.freeze({ ...DEFAULT_FROM, ...animation.from }),
    to: Object.freeze({ ...DEFAULT_TO, ...animation.to }),
    at: Object.freeze(at),
  });
}

function createOptions(options = {}) {
  if (!Array.isArray(options.animations) || options.animations.length === 0) {
    throw new Error('animations에는 하나 이상의 애니메이션 설정이 필요합니다.');
  }
  if (options.respectReducedMotion != null && typeof options.respectReducedMotion !== 'boolean') {
    throw new Error('respectReducedMotion은 boolean이어야 합니다.');
  }

  return Object.freeze({
    animations: Object.freeze(options.animations.map(createAnimationSettings)),
    respectReducedMotion: options.respectReducedMotion ?? true,
  });
}

function resolvedToVars(settings, reducedMotion) {
  if (!reducedMotion) return { ...settings.to, paused: true };
  return {
    ...settings.to,
    duration: 0,
    delay: 0,
    stagger: 0,
    paused: true,
  };
}

function createGroup({ gsap, target, settings, reducedMotion }) {
  const elements = selectWithin(target, settings.selector);
  let animation = null;
  const context = gsap.context(() => {
    if (elements.length === 0) return;

    const toVars = resolvedToVars(settings, reducedMotion);
    animation = settings.prepare === 'gsap'
      ? gsap.fromTo(elements, { ...settings.from }, toVars)
      : gsap.to(elements, toVars);
  }, target);

  pauseAtStart(animation);
  return {
    settings,
    elements,
    animation,
    context,
    entered: false,
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
  } else if (group.settings.reentry === 'always') {
    restart(group.animation);
  } else if (group.settings.reentry === 'once') {
    showImmediately(group.animation);
  } else {
    playFromCurrent(group.animation);
  }
}

function leaveGroup(group) {
  if (!group?.animation || !group.entered || group.settings.reentry === 'preserve') return;
  reverse(group.animation);
}

function snapshotScene(scene) {
  if (!scene) return [];
  return scene.groups.map((group) => ({
    group,
    entered: group.entered,
    progress: animationProgress(group.animation),
  }));
}

function restoreScene(snapshot) {
  snapshot.forEach(({ group, entered, progress }) => {
    group.entered = entered;
    restoreProgress(group.animation, progress);
  });
}

/**
 * Prepares route-scoped GSAP animation groups and connects them to FullScroll
 * lifecycle phases selected by each group.
 */
export function createGsapScenes(target, options = {}) {
  const { root, instance } = resolveTarget(target);
  if (!isElement(root)) {
    throw new Error('[FullScroll] GSAP 연동에는 FullScroll 인스턴스가 필요합니다.');
  }

  const gsap = options.gsap;
  checkRuntime(gsap);
  const settings = createOptions(options);
  const scenes = new Map();
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
        reducedMotion: reducedMotion(),
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
      if (
        group.settings.at.initial === 'ready' ||
        (group.settings.at.initial === 'manual' && manualStarted)
      ) {
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

  function prepareRoutes(current) {
    if (destroyed || !current) return;

    try {
      const currentScene = ensureScene(current);
      instance.state.routes.forEach((route) => {
        if (routeTarget(route) !== routeTarget(current)) ensureScene(route);
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
    if (activeTransition || root.hasAttribute('fs-responsive')) return;

    const scene = ensureScene(instance.state.current);
    scene?.groups.forEach((group) => {
      if (group.settings.at.initial === 'manual' && !group.entered) playGroup(group);
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

    if (
      activeTransition &&
      routeTarget(activeTransition.origin) === routeTarget(origin) &&
      routeTarget(activeTransition.destination) === routeTarget(destination)
    ) {
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
      destinationSnapshot: snapshotScene(destinationScene),
    };

    playLeave(origin, 'transitionstart');
    playEnter(destination, 'transitionstart');
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

    playLeave(origin, 'change');
    playEnter(destination, 'change');
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
    root.removeEventListener('fullscroll:ready', onReady);
    root.removeEventListener('fullscroll:transitionstart', onTransitionStart);
    root.removeEventListener('fullscroll:transitioncancel', onTransitionCancel);
    root.removeEventListener('fullscroll:change', onChange);
    root.removeEventListener('fullscroll:responsive', onResponsive);
    root.removeEventListener('fullscroll:refresh', onRefresh);
    root.removeEventListener('fullscroll:destroy', onDestroy);
    clearScenes();
  }

  const current = instance.state.current;
  if (current && !root.hasAttribute('fs-responsive')) {
    try {
      prepareRoutes(current);
    } catch (error) {
      destroyed = true;
      throw error;
    }
  }

  root.addEventListener('fullscroll:ready', onReady);
  root.addEventListener('fullscroll:transitionstart', onTransitionStart);
  root.addEventListener('fullscroll:transitioncancel', onTransitionCancel);
  root.addEventListener('fullscroll:change', onChange);
  root.addEventListener('fullscroll:responsive', onResponsive);
  root.addEventListener('fullscroll:refresh', onRefresh);
  root.addEventListener('fullscroll:destroy', onDestroy);

  return Object.freeze({
    root,
    playCurrent,
    refresh() {
      if (destroyed) return;
      clearScenes();
      if (!root.hasAttribute('fs-responsive')) prepareRoutes(instance.state.current);
    },
    destroy,
  });
}
