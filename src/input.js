import { INTERACTIVE_SELECTOR, WHEEL_INTERACTIVE_SELECTOR } from './config.js';
import { closestWithin } from './dom.js';
import { normalizeWheelDelta, readGesture } from './gestures.js';
import {
  canAnyScroll,
  captureScrollGesture,
  getScrollAreas,
  scrollGestureWasConsumed,
} from './scroll.js';

export function createInputController({
  root,
  options,
  isActive,
  isMoving,
  currentHorizon,
  move,
  moveWithinHorizon,
  moveToBoundary,
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
    if (!isActive() || event.ctrlKey || closestWithin(root, event.target, '[fs-ignore]')) return;

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
    Promise.resolve(move(direction, 'wheel')).finally(scheduleWheelUnlock);
  }

  function onKeyDown(event) {
    if (!isActive() || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (
      event.target instanceof Element &&
      (event.target.matches(INTERACTIVE_SELECTOR) || closestWithin(root, event.target, '[fs-ignore]'))
    ) {
      return;
    }

    let action = null;
    if (['ArrowDown', 'PageDown'].includes(event.key) || (event.code === 'Space' && !event.shiftKey)) {
      action = () => move(1, 'keyboard');
    } else if (
      ['ArrowUp', 'PageUp'].includes(event.key) ||
      (event.code === 'Space' && event.shiftKey)
    ) {
      action = () => move(-1, 'keyboard');
    } else if (event.key === 'ArrowRight') {
      action = () => moveWithinHorizon(1, 'keyboard');
    } else if (event.key === 'ArrowLeft') {
      action = () => moveWithinHorizon(-1, 'keyboard');
    } else if (event.key === 'Home') {
      action = () => moveToBoundary('first', 'keyboard');
    } else if (event.key === 'End') {
      action = () => moveToBoundary('last', 'keyboard');
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
      scrollSnapshot: captureScrollGesture(scrollAreas),
    };
  }

  function finishGesture(gesture, clientX, clientY) {
    const result = readGesture(gesture, clientX, clientY, options.touchThreshold);
    if (!result) return;

    const { direction, vertical } = result;
    if (
      vertical &&
      gesture.scrollAreas.length > 0 &&
      (scrollGestureWasConsumed(gesture.scrollSnapshot) || canAnyScroll(gesture.scrollAreas, direction))
    ) {
      return;
    }

    if (!vertical && currentHorizon()?.only) {
      moveWithinHorizon(direction, 'touch');
      return;
    }
    move(direction, 'touch');
  }

  function onPointerDown(event) {
    if (
      !isActive() ||
      event.pointerType === 'mouse' ||
      event.pointerType === 'touch' ||
      !event.isPrimary ||
      closestWithin(root, event.target, '[fs-ignore]') ||
      (event.target instanceof Element && event.target.matches(INTERACTIVE_SELECTOR))
    ) {
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
    if (
      !isActive() ||
      event.touches.length > 1 ||
      closestWithin(root, event.target, '[fs-ignore]') ||
      (event.target instanceof Element && event.target.matches(INTERACTIVE_SELECTOR))
    ) {
      return;
    }

    const point = event.changedTouches[0];
    if (point) touch = startGesture(event, point, point.identifier);
  }

  function onTouchEnd(event) {
    if (!touch || isMoving()) {
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
  }

  function attach() {
    if (attached) return;
    attached = true;
    root.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('pointerdown', onPointerDown, { passive: true });
    root.addEventListener('pointerup', onPointerUp, { passive: true });
    root.addEventListener('pointercancel', clearGestures, { passive: true });
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    root.addEventListener('touchcancel', clearGestures, { passive: true });
    document.addEventListener('keydown', onKeyDown);
  }

  function detach() {
    if (attached) {
      attached = false;
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', clearGestures);
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('touchcancel', clearGestures);
      document.removeEventListener('keydown', onKeyDown);
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
