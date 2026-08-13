import { clamp } from './dom.js';
import { pauseRouteMedia, playRouteMedia } from './media.js';

export function createRouteState({ root, stepReentry, themeTarget, getSnapshots, warn }) {
  const stepStates = new WeakMap();
  const themeSnapshots = new Map();
  let themeTargets = [];
  let stepElement = null;
  let activeMediaElement = null;

  function setupThemeTargets() {
    restoreThemeTargets();
    if (!themeTarget) return;
    if (typeof themeTarget !== 'string') {
      warn('themeTarget은 헤더 요소를 찾는 CSS 선택자 문자열이어야 합니다.');
      return;
    }

    try {
      themeTargets = Array.from(document.querySelectorAll(themeTarget));
    } catch {
      warn(`themeTarget 선택자가 올바르지 않습니다: ${themeTarget}`);
      return;
    }

    themeTargets.forEach((target) => {
      themeSnapshots.set(target, target.getAttribute('fs-theme'));
    });
  }

  function restoreThemeTargets() {
    themeSnapshots.forEach((theme, target) => {
      if (theme === null) target.removeAttribute('fs-theme');
      else target.setAttribute('fs-theme', theme);
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
      reentry: route.stepReentry ?? stepReentry,
    };
  }

  function applyStepEntry(destination, origin) {
    const step = stepInfo(destination);
    if (!step || step.element === origin?.stepElement) return;

    if (step.reentry === 'first') stepStates.set(step.element, 1);
    else if (step.reentry === 'last') stepStates.set(step.element, step.max);
    else if (!stepStates.has(step.element)) stepStates.set(step.element, 1);
  }

  function setStep(element, value) {
    stepStates.set(element, value);
  }

  function syncStep(route) {
    if (stepElement && stepElement !== route.stepElement) {
      stepElement.removeAttribute('fs-step-current');
    }

    const step = stepInfo(route);
    stepElement = step?.element ?? null;
    if (step) step.element.setAttribute('fs-step-current', String(step.current));
  }

  function syncMedia(route) {
    const nextElement = route?.mediaElement ?? null;
    if (nextElement === activeMediaElement) return;

    pauseRouteMedia(activeMediaElement);
    activeMediaElement = nextElement;
    playRouteMedia(nextElement);
  }

  function syncTheme(route) {
    const theme = route.slide?.getAttribute('fs-theme') ?? route.page.getAttribute('fs-theme');
    const targets = [root, ...themeTargets];

    targets.forEach((target) => {
      if (theme !== null) {
        target.setAttribute('fs-theme', theme);
      } else if (target === root) {
        target.removeAttribute('fs-theme');
      } else {
        const originalTheme = themeSnapshots.get(target);
        if (originalTheme === null) target.removeAttribute('fs-theme');
        else target.setAttribute('fs-theme', originalTheme);
      }
    });
  }

  function setRuntimeInert(element, inactive) {
    const original = getSnapshots().get(element)?.some(([name]) => name === 'inert');
    if (inactive || original) element.setAttribute('inert', '');
    else element.removeAttribute('inert');
  }

  function syncAccessibility(route, pages, horizons, flowView) {
    const visibleSlides = new Set([route.slide]);
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
      const intersectsViewport =
        hasViewport &&
        route.flow &&
        bounds &&
        bounds.bottom > viewport.top + 1 &&
        bounds.top < viewport.bottom - 1;
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
    stepElement?.removeAttribute('fs-step-current');
    stepElement = null;
  }

  return Object.freeze({
    applyStepEntry,
    destroy,
    setStep,
    setupThemeTargets,
    stepInfo,
    sync,
    syncMedia,
  });
}
