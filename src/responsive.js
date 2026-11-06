import { clamp } from './dom.js';

export function closestRouteToViewport(routes, currentIndex) {
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

export function scrollRouteIntoView(route, smooth) {
  const element = route?.slide ?? route?.page;
  element?.scrollIntoView?.({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
}

export function createResponsiveController({
  breakpoint,
  isDestroyed,
  isDisabled,
  isResponsive,
  isActive,
  isMoving,
  onEnter,
  onExit,
  onResize,
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

      // A pending settle during a transition would fight the transition and
      // leave the runtime on a different route than the public state.
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
    window.addEventListener('resize', refresh, { passive: true });
    window.addEventListener('orientationchange', refresh, { passive: true });
  }

  function stop() {
    if (started) {
      started = false;
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
    }
    clearTimeout(resizeTimer);
  }

  return Object.freeze({ matches, refresh, start, stop });
}
