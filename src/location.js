import { hashForRoute, routeIndexFromHash } from './routes.js';

export function createLocationController({
  history,
  getAnchorMap,
  getRoutes,
  getCurrentIndex,
  isDestroyed,
  isMoving,
  isActive,
  moveTo,
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
          trigger: 'history',
          updateHistory: false,
          instant: !isActive(),
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
    window.history.pushState(window.history.state, '', hash);
  }

  function start() {
    if (started) return;
    started = true;
    window.addEventListener('popstate', onChange);
    window.addEventListener('hashchange', onChange);
  }

  function stop() {
    if (started) {
      started = false;
      window.removeEventListener('popstate', onChange);
      window.removeEventListener('hashchange', onChange);
    }
    pendingIndex = null;
  }

  return Object.freeze({ flush, onChange, read, resolve, start, stop, write });
}
