import { effectOptions } from './effects.js';
import { resolveFlowView } from './flow.js';

function createRuntime(root, routes) {
  return {
    rootWrapper: document.createElement('div'),
    rootMarkers: new Map(),
    horizons: [],
    footerRoute: routes.find((route) => route.flowFooter) ?? null,
    footerStage: null,
    rootViewport: root,
    rootEffect: 'slide',
  };
}

function mountRootStructure({ root, pages, runtime }) {
  runtime.rootWrapper.className = 'swiper-wrapper fs-vertical-wrapper';
  const firstPage = pages[0];

  if (runtime.footerRoute) {
    runtime.footerStage = document.createElement('div');
    runtime.footerStage.className = 'fs-footer-stage';
    runtime.rootViewport = document.createElement('div');
    runtime.rootViewport.className = 'swiper fs-effect-viewport';
    runtime.rootViewport.append(runtime.rootWrapper);
    runtime.footerStage.append(runtime.rootViewport);
    root.insertBefore(runtime.footerStage, firstPage);
  } else {
    root.insertBefore(runtime.rootWrapper, firstPage);
  }

  for (const page of pages) {
    const marker = document.createComment('fullscroll-page');
    root.insertBefore(marker, page);
    runtime.rootMarkers.set(page, marker);

    if (page === runtime.footerRoute?.page) {
      runtime.footerStage.append(page);
    } else {
      page.classList.add('swiper-slide');
      runtime.rootWrapper.append(page);
    }
  }
}

function markFlowRoutes(routes) {
  for (const route of routes) {
    if (route.flow && !route.flowFooter) {
      (route.slide ?? route.page).setAttribute('fs-flow-active', '');
    }
  }
}

function mountHorizon({ horizon, currentRoute, horizontalEffect, Swiper, options }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'swiper-wrapper fs-horizon-wrapper';
  horizon.wrapper = wrapper;
  horizon.markers = new Map();

  horizon.page.insertBefore(wrapper, horizon.slides[0]);
  for (const slide of horizon.slides) {
    const marker = document.createComment('fullscroll-slide');
    horizon.page.insertBefore(marker, slide);
    horizon.markers.set(slide, marker);
    slide.classList.add('swiper-slide');
    wrapper.append(slide);
  }

  horizon.page.classList.add('swiper', 'fs-horizon-runtime');
  const hasFlowSlide = horizon.routes.some((route) => route.flow);
  const effect = hasFlowSlide ? 'slide' : (horizon.effect ?? horizontalEffect);
  horizon.runtimeEffect = effect;
  horizon.page.setAttribute('fs-effect-active', effect);

  const initialSlide =
    currentRoute.pageIndex === horizon.pageIndex && currentRoute.slideIndex !== null
      ? currentRoute.slideIndex
      : 0;

  horizon.swiper = new Swiper(horizon.page, {
    ...options.horizontalSwiper,
    ...effectOptions(effect, 'horizontal'),
    direction: 'horizontal',
    slidesPerView: hasFlowSlide ? 'auto' : 1,
    ...(hasFlowSlide ? { slidesPerGroup: 1, slidesPerGroupAuto: false } : {}),
    initialSlide,
    speed: options.speed,
    allowTouchMove: false,
    simulateTouch: false,
    nested: true,
    mousewheel: false,
    keyboard: false,
    observer: false,
    observeParents: false,
  });
}

function mountRootSwiper({ runtime, currentRoute, rootEffect, hasFlowPage, Swiper, options }) {
  runtime.rootEffect = hasFlowPage ? 'slide' : rootEffect;
  const initialPageIndex = runtime.footerRoute && currentRoute.flowFooter
    ? runtime.footerRoute.pageIndex - 1
    : currentRoute.pageIndex;

  return new Swiper(runtime.rootViewport, {
    ...options.verticalSwiper,
    ...effectOptions(runtime.rootEffect, 'vertical'),
    direction: 'vertical',
    slidesPerView: hasFlowPage ? 'auto' : 1,
    ...(hasFlowPage ? { slidesPerGroup: 1, slidesPerGroupAuto: false } : {}),
    initialSlide: initialPageIndex,
    speed: options.speed,
    allowTouchMove: false,
    simulateTouch: false,
    mousewheel: false,
    keyboard: false,
    observer: false,
    observeParents: false,
  });
}

export function mountRuntime({
  root,
  pages,
  routes,
  horizons,
  currentRoute,
  Swiper,
  options,
  readEffect,
  warn,
}) {
  const runtime = createRuntime(root, routes);
  let rootSwiper = null;

  markFlowRoutes(routes);
  mountRootStructure({ root, pages, runtime });
  root.classList.add('fs-root');
  if (!runtime.footerRoute) root.classList.add('swiper');
  root.style.setProperty('--fs-speed', `${options.speed}ms`);
  root.style.setProperty('--fs-easing', options.easing);
  root.setAttribute('fs-ready', '');

  const hasFlowPage = routes.some(
    (route) => route.slideIndex === null && route.flow && !route.flowFooter,
  );
  const rootAttributeEffect = root.getAttribute('fs-effect');
  const rootEffect = readEffect(
    rootAttributeEffect,
    options.effect ?? options.verticalSwiper.effect,
  );
  const horizontalEffect = readEffect(
    rootAttributeEffect,
    options.effect ?? options.horizontalSwiper.effect,
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
      options,
    });
    root.setAttribute('fs-effect-active', runtime.rootEffect);

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
    warn(`${label} Swiper 제거 중 오류가 발생했습니다: ${error.message}`);
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
    if (
      (page.parentNode === runtime.rootWrapper || page.parentNode === runtime.footerStage) &&
      marker.parentNode === root
    ) {
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

export function unmountRuntime({ root, runtime, rootSwiper, warn }) {
  if (!runtime) return;

  destroySwiper(rootSwiper, '세로', warn);
  for (const horizon of runtime.horizons) {
    destroySwiper(horizon.swiper, '가로', warn);
  }
  for (const horizon of runtime.horizons) {
    restoreHorizon(horizon);
  }
  restoreRoot(root, runtime);
}
