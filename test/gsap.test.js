import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGsapScenes } from '../src/gsap.js';

const controllers = new Set();

function createFakeGsap() {
  const calls = [];
  let activeContext = null;

  const elementsOf = (targets) => targets instanceof Element ? [targets] : Array.from(targets ?? []);

  function capture(target) {
    if (activeContext && !activeContext.styles.has(target)) {
      activeContext.styles.set(target, target.getAttribute('style'));
    }
  }

  function apply(targets, vars) {
    elementsOf(targets).forEach((target) => {
      capture(target);
      if ('autoAlpha' in vars) {
        target.style.opacity = String(vars.autoAlpha);
        target.style.visibility = vars.autoAlpha === 0 ? 'hidden' : 'inherit';
      }
      if ('y' in vars) target.style.transform = `translateY(${vars.y}px)`;
    });
  }

  class Animation {
    constructor(kind, targets, fromVars, toVars, originals) {
      this.kind = kind;
      this.targets = elementsOf(targets);
      this.fromVars = fromVars;
      this.toVars = toVars;
      this.originals = originals;
      this.progressValue = 0;
    }

    applyStart() {
      if (this.fromVars) {
        apply(this.targets, this.fromVars);
        return;
      }
      this.targets.forEach((target) => {
        const style = this.originals.get(target);
        if (style === null) target.removeAttribute('style');
        else target.setAttribute('style', style);
      });
    }

    pause(position) {
      calls.push([this.kind, 'pause', position]);
      if (typeof position === 'number') {
        this.progressValue = position;
        if (position === 0 && this.fromVars) this.applyStart();
      }
      return this;
    }

    play() {
      calls.push([this.kind, 'play']);
      this.progressValue = 1;
      apply(this.targets, this.toVars);
      return this;
    }

    restart() {
      calls.push([this.kind, 'restart']);
      this.progressValue = 1;
      apply(this.targets, this.toVars);
      return this;
    }

    reverse() {
      calls.push([this.kind, 'reverse']);
      this.progressValue = 0;
      this.applyStart();
      return this;
    }

    progress(value) {
      if (typeof value !== 'number') return this.progressValue;
      calls.push([this.kind, 'progress', value]);
      this.progressValue = value;
      if (value === 0) this.applyStart();
      else apply(this.targets, this.toVars);
      return this;
    }
  }

  function createAnimation(kind, targets, fromVars, toVars) {
    const elements = elementsOf(targets);
    const originals = new Map(elements.map((target) => [target, target.getAttribute('style')]));
    elements.forEach(capture);
    if (fromVars) apply(elements, fromVars);
    calls.push([kind, elements, fromVars, toVars]);
    return new Animation(kind, elements, fromVars, toVars, originals);
  }

  return {
    calls,
    context(callback, scope) {
      const context = {
        styles: new Map(),
        revert() {
          context.styles.forEach((style, target) => {
            if (style === null) target.removeAttribute('style');
            else target.setAttribute('style', style);
          });
          calls.push(['context', 'revert', scope]);
        },
      };
      const previous = activeContext;
      activeContext = context;
      callback();
      activeContext = previous;
      return context;
    },
    fromTo(targets, fromVars, toVars) {
      return createAnimation('fromTo', targets, fromVars, toVars);
    },
    to(targets, toVars) {
      return createAnimation('to', targets, null, toVars);
    },
  };
}

function route(page, index, slide = null) {
  return { index, pageIndex: slide ? 0 : index, slideIndex: slide ? index : null, page, slide };
}

function mount({ third = false, horizontal = false } = {}) {
  document.body.innerHTML = horizontal
    ? `<main fs><section fs-horizon><aside fs-overlay><b data-item>Overlay</b></aside><article id="one"><b data-item>One</b><i data-late>Late</i></article><article id="two"><b data-item>Two</b><i data-late>Late</i></article></section></main>`
    : `<main fs><section id="one"><b data-item>One</b><i data-late>Late</i></section><section id="two"><b data-item>Two</b><i data-late>Late</i></section>${third ? '<section id="three"><b data-item>Three</b><i data-late>Late</i></section>' : ''}</main>`;
  const root = document.querySelector('[fs]');
  const page = horizontal ? root.firstElementChild : null;
  const targets = horizontal ? Array.from(page.querySelectorAll(':scope > article')) : Array.from(root.children);
  const routes = targets.map((target, index) => route(page ?? target, index, horizontal ? target : null));
  const model = { routes, current: routes[0] };
  const instance = { root, get state() { return { routes: model.routes, current: model.current }; } };
  return { root, targets, routes, model, instance };
}

function config(overrides = {}) {
  return {
    selector: '[data-item]',
    prepare: 'gsap',
    at: { initial: 'manual', enter: 'change', leave: 'transitionstart' },
    reentry: 'always',
    ...overrides,
  };
}

function create(mountResult, animations, extra = {}) {
  const gsap = createFakeGsap();
  const controller = createGsapScenes(mountResult.instance, { gsap, animations, ...extra });
  controllers.add(controller);
  return { gsap, controller };
}

function dispatch(root, name, detail) {
  root.dispatchEvent(new CustomEvent(`fullscroll:${name}`, { detail }));
}

function actions(gsap, kind, action) {
  return gsap.calls.filter(([calledKind, calledAction]) => calledKind === kind && calledAction === action);
}

function move(mountResult, fromIndex, toIndex) {
  const origin = mountResult.routes[fromIndex];
  const destination = mountResult.routes[toIndex];
  dispatch(mountResult.root, 'transitionstart', { origin, destination });
  mountResult.model.current = destination;
  dispatch(mountResult.root, 'change', { origin, destination });
}

afterEach(() => {
  controllers.forEach((controller) => controller.destroy());
  controllers.clear();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('GSAP scenes adapter', () => {
  it('requires explicit animation groups and validates lifecycle values', () => {
    const mounted = mount();
    const gsap = createFakeGsap();
    expect(() => createGsapScenes(mounted.instance, { gsap })).toThrow(/animations/);
    expect(() => createGsapScenes(mounted.instance, { gsap, animations: [config({ prepare: 'bad' })] })).toThrow(/prepare/);
  });

  it('rejects destroyed FullScroll instances', () => {
    const mounted = mount();
    const gsap = createFakeGsap();
    mounted.instance.destroyed = true;

    expect(() => createGsapScenes(mounted.instance, { gsap, animations: [config()] })).toThrow(
      /FullScroll 인스턴스/,
    );
  });

  it('reverts prepared groups and leaves no listeners when scene creation fails', () => {
    const mounted = mount();
    const gsap = createFakeGsap();

    expect(() =>
      createGsapScenes(mounted.instance, {
        gsap,
        animations: [config(), config({ selector: '[' })],
      }),
    ).toThrow();

    expect(mounted.targets[0].querySelector('[data-item]').getAttribute('style')).toBeNull();
    const definitions = gsap.calls.filter(([kind]) => kind === 'fromTo').length;
    dispatch(mounted.root, 'ready', { current: mounted.routes[0] });
    expect(gsap.calls.filter(([kind]) => kind === 'fromTo')).toHaveLength(definitions);
  });

  it('supports GSAP-owned and CSS-owned initial visibility', () => {
    const gsapMount = mount();
    create(gsapMount, [config()]);
    expect(gsapMount.targets.every((target) => target.querySelector('[data-item]').style.opacity === '0')).toBe(true);

    const cssMount = mount();
    cssMount.targets.forEach((target) => target.querySelector('[data-item]').style.opacity = '0.25');
    create(cssMount, [config({ prepare: 'css' })]);
    expect(cssMount.targets.every((target) => target.querySelector('[data-item]').style.opacity === '0.25')).toBe(true);
  });

  it('plays ready groups immediately and manual groups once through playCurrent', () => {
    const mounted = mount();
    const { gsap, controller } = create(mounted, [
      config({ at: { initial: 'ready', enter: 'change', leave: 'none' } }),
      config({ selector: '[data-late]' }),
    ]);
    expect(mounted.targets[0].querySelector('[data-item]').style.opacity).toBe('1');
    expect(mounted.targets[0].querySelector('[data-late]').style.opacity).toBe('0');
    controller.playCurrent();
    controller.playCurrent();
    expect(mounted.targets[0].querySelector('[data-late]').style.opacity).toBe('1');
    expect(actions(gsap, 'fromTo', 'restart')).toHaveLength(2);
  });

  it('lets each group start at transitionstart or change', () => {
    const mounted = mount();
    const { controller } = create(mounted, [
      config({ at: { initial: 'manual', enter: 'transitionstart', leave: 'none' } }),
      config({ selector: '[data-late]', at: { initial: 'manual', enter: 'change', leave: 'none' } }),
    ]);
    controller.playCurrent();
    const [origin, destination] = mounted.routes;
    dispatch(mounted.root, 'transitionstart', { origin, destination });
    expect(mounted.targets[1].querySelector('[data-item]').style.opacity).toBe('1');
    expect(mounted.targets[1].querySelector('[data-late]').style.opacity).toBe('0');
    dispatch(mounted.root, 'change', { origin, destination });
    expect(mounted.targets[1].querySelector('[data-late]').style.opacity).toBe('1');
  });

  it('runs leave groups at transitionstart, change, or never', () => {
    const mounted = mount();
    const { controller } = create(mounted, [
      config({ at: { initial: 'manual', enter: 'change', leave: 'transitionstart' } }),
      config({ selector: '[data-late]', at: { initial: 'manual', enter: 'change', leave: 'change' } }),
    ]);
    controller.playCurrent();
    const [origin, destination] = mounted.routes;
    dispatch(mounted.root, 'transitionstart', { origin, destination });
    expect(mounted.targets[0].querySelector('[data-item]').style.opacity).toBe('0');
    expect(mounted.targets[0].querySelector('[data-late]').style.opacity).toBe('1');
    dispatch(mounted.root, 'change', { origin, destination });
    expect(mounted.targets[0].querySelector('[data-late]').style.opacity).toBe('0');
  });

  it('restores both routes when a transition is cancelled', () => {
    const mounted = mount();
    const { controller } = create(mounted, [config({ at: { initial: 'manual', enter: 'transitionstart', leave: 'transitionstart' } })]);
    controller.playCurrent();
    const [origin, destination] = mounted.routes;
    dispatch(mounted.root, 'transitionstart', { origin, destination });
    expect(mounted.targets[0].querySelector('[data-item]').style.opacity).toBe('0');
    expect(mounted.targets[1].querySelector('[data-item]').style.opacity).toBe('1');
    dispatch(mounted.root, 'transitioncancel', { origin, destination });
    expect(mounted.targets[0].querySelector('[data-item]').style.opacity).toBe('1');
    expect(mounted.targets[1].querySelector('[data-item]').style.opacity).toBe('0');
  });

  it('replaces an interrupted transition snapshot before starting the next one', () => {
    const mounted = mount({ third: true });
    const { controller } = create(mounted, [config({ at: { initial: 'manual', enter: 'transitionstart', leave: 'transitionstart' } })]);
    controller.playCurrent();
    dispatch(mounted.root, 'transitionstart', { origin: mounted.routes[0], destination: mounted.routes[1] });
    dispatch(mounted.root, 'transitionstart', { origin: mounted.routes[0], destination: mounted.routes[2] });
    expect(mounted.targets[1].querySelector('[data-item]').style.opacity).toBe('0');
    expect(mounted.targets[2].querySelector('[data-item]').style.opacity).toBe('1');
  });

  it('applies always, once, and preserve reentry independently', () => {
    for (const policy of ['always', 'once', 'preserve']) {
      const mounted = mount();
      const { gsap, controller } = create(mounted, [config({ reentry: policy })]);
      controller.playCurrent();
      move(mounted, 0, 1);
      move(mounted, 1, 0);
      const firstAnimationRestarts = actions(gsap, 'fromTo', 'restart').length;
      if (policy === 'always') expect(firstAnimationRestarts).toBe(3);
      if (policy === 'once') expect(firstAnimationRestarts).toBe(2);
      if (policy === 'preserve') expect(actions(gsap, 'fromTo', 'play').length).toBeGreaterThan(0);
      controller.destroy();
      controllers.delete(controller);
    }
  });

  it('uses only official routes and excludes a horizontal overlay', () => {
    const mounted = mount({ horizontal: true });
    const { gsap } = create(mounted, [config()]);
    expect(gsap.calls.filter(([kind, targets]) => kind === 'fromTo' && Array.isArray(targets))).toHaveLength(2);
    expect(mounted.root.querySelector('[fs-overlay] [data-item]').getAttribute('style')).toBeNull();
  });

  it('handles empty selectors and preserves stagger for multiple targets', () => {
    const mounted = mount();
    mounted.targets[0].insertAdjacentHTML('beforeend', '<b data-item>Extra</b>');
    const { gsap } = create(mounted, [config({ to: { stagger: 0.12 } }), config({ selector: '.missing' })]);
    const definition = gsap.calls.find(([kind, targets]) => kind === 'fromTo' && targets.length === 2);
    expect(definition[3].stagger).toBe(0.12);
  });

  it('zeroes motion timing when reduced motion is requested', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
    const mounted = mount();
    const { gsap } = create(mounted, [config({ to: { duration: 1, delay: 0.2, stagger: 0.1 } })]);
    const definitions = gsap.calls.filter(([kind, targets]) => kind === 'fromTo' && Array.isArray(targets));
    expect(definitions.every(([, , , vars]) => vars.duration === 0 && vars.delay === 0 && vars.stagger === 0)).toBe(true);
  });

  it('rebuilds routes on refresh and retains a requested manual start', () => {
    const mounted = mount();
    const { controller } = create(mounted, [config()]);
    controller.playCurrent();
    const added = document.createElement('section');
    added.innerHTML = '<b data-item>Three</b>';
    mounted.root.append(added);
    mounted.model.routes = [...mounted.routes, route(added, 2)];
    dispatch(mounted.root, 'refresh', { current: mounted.model.current, responsive: false });
    expect(mounted.targets[0].querySelector('[data-item]').style.opacity).toBe('1');
    expect(added.querySelector('[data-item]').style.opacity).toBe('0');
  });

  it('defers manual play in responsive mode and rebuilds when it exits', () => {
    const mounted = mount();
    mounted.root.setAttribute('fs-responsive', '');
    const { controller } = create(mounted, [config()]);
    controller.playCurrent();
    mounted.root.removeAttribute('fs-responsive');
    dispatch(mounted.root, 'responsive', { responsive: false, current: mounted.model.current });
    expect(mounted.targets[0].querySelector('[data-item]').style.opacity).toBe('1');
  });

  it('reverts inline styles and removes listeners on destroy', () => {
    const mounted = mount();
    const { gsap, controller } = create(mounted, [config()]);
    controller.destroy();
    controllers.delete(controller);
    expect(mounted.targets.every((target) => target.querySelector('[data-item]').getAttribute('style') === null)).toBe(true);
    dispatch(mounted.root, 'ready', { current: mounted.routes[0] });
    expect(gsap.calls.filter(([kind, targets]) => kind === 'fromTo' && Array.isArray(targets))).toHaveLength(2);
  });
});
