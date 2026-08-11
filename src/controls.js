import { captureAttributes, restoreAttributes } from './dom.js';

const CONTROL_SELECTOR =
  '[fs-prev], [fs-next], [fs-move], [fs-current], [fs-total], [fs-progress]';

function moveReference(element) {
  const direct = element.getAttribute('fs-move')?.trim();
  if (direct) return direct;

  const href = element.getAttribute('href');
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

export function createControls({ isActive, resolveRoute, onPrev, onNext, onMove, warn }) {
  const elements = Array.from(document.querySelectorAll(CONTROL_SELECTOR));
  const snapshots = new Map();
  const listeners = [];

  for (const element of elements) {
    snapshots.set(element, {
      attributes: captureAttributes(element),
      childNodes: Array.from(element.childNodes),
    });
  }

  const listen = (element, callback) => {
    element.addEventListener('click', callback);
    listeners.push([element, callback]);
  };

  elements.filter((element) => element.hasAttribute('fs-prev')).forEach((element) => {
    listen(element, (event) => {
      if (!isActive() || element.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      onPrev();
    });
  });

  elements.filter((element) => element.hasAttribute('fs-next')).forEach((element) => {
    listen(element, (event) => {
      if (!isActive() || element.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      onNext();
    });
  });

  const moves = elements
    .filter((element) => element.hasAttribute('fs-move'))
    .map((element) => {
      const reference = moveReference(element);
      const routeIndex = reference ? resolveRoute(reference) : null;
      if (routeIndex === null) {
        warn(`fs-move 대상을 찾을 수 없습니다: ${reference ?? '(비어 있음)'}`);
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

      if (element.hasAttribute('fs-current')) {
        element.replaceChildren(String(humanIndex));
      }

      if (element.hasAttribute('fs-total')) {
        element.replaceChildren(String(safeTotal));
      }

      if (element.hasAttribute('fs-progress')) {
        element.style.setProperty('--fs-progress', String(ratio));
        setValueState(element, snapshot, 'aria-valuemin', '1');
        setValueState(element, snapshot, 'aria-valuemax', String(safeTotal));
        setValueState(element, snapshot, 'aria-valuenow', String(humanIndex));
        setValueState(element, snapshot, 'aria-valuetext', `${humanIndex} / ${safeTotal}`);

        if (element instanceof HTMLProgressElement) {
          element.max = safeTotal || 1;
          element.value = humanIndex;
        } else if (!element.hasAttribute('role')) {
          element.setAttribute('role', 'progressbar');
        }
      }

      if (element.hasAttribute('fs-prev') || element.hasAttribute('fs-next')) {
        const authorDisabled =
          originalAttribute(snapshot, 'disabled') !== null ||
          originalAttribute(snapshot, 'aria-disabled') === 'true';
        const unavailable =
          !active ||
          authorDisabled ||
          safeTotal === 0 ||
          element.hasAttribute('fs-prev') && currentIndex <= 0 ||
          element.hasAttribute('fs-next') && currentIndex >= safeTotal - 1;

        setValueState(element, snapshot, 'aria-disabled', unavailable ? 'true' : null);
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
        'aria-current',
        routeIndex !== null && routeIndex === currentIndex ? 'page' : null,
      );
    }
  }

  function destroy() {
    listeners.forEach(([element, callback]) => element.removeEventListener('click', callback));
    for (const [element, snapshot] of snapshots) {
      restoreAttributes(element, snapshot.attributes);
      if (element.hasAttribute('fs-current') || element.hasAttribute('fs-total')) {
        element.replaceChildren(...snapshot.childNodes);
      }
    }
  }

  return { sync, destroy };
}
