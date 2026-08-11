import { clamp, getDirectElements, getDirectPages } from './dom.js';

const FLOW_RELATIONS = new Set(['prev', 'next']);

function readFlowSettings(element, warn, { allowRelations = true } = {}) {
  const flow = element.hasAttribute('fs-flow');
  const settings = {
    flow,
    flowEnterWith: null,
    flowExitWith: null,
  };

  for (const [attribute, key] of [
    ['fs-flow-enter', 'flowEnterWith'],
    ['fs-flow-exit', 'flowExitWith'],
  ]) {
    const value = element.getAttribute(attribute)?.trim().toLowerCase() || null;
    if (!value) continue;

    if (!flow) {
      warn(`[${attribute}]은 fs-flow가 붙은 요소에서만 사용할 수 있습니다.`);
      continue;
    }

    if (!allowRelations) {
      warn(`${attribute}은 fs-horizon의 직계 fs-flow 슬라이드에서만 사용할 수 있습니다.`);
      continue;
    }

    if (!FLOW_RELATIONS.has(value)) {
      warn(`${attribute}에는 prev 또는 next만 사용할 수 있습니다.`);
      continue;
    }

    settings[key] = value;
  }

  return settings;
}

export function scanRoutes(root, warn) {
  const pages = getDirectPages(root);
  const routes = [];
  const anchorMap = new Map();
  const horizons = new Map();

  if (pages.length === 0) {
    throw new Error('[FullScroll] [fs] 바로 아래에 section 또는 [fs-page] 요소가 필요합니다.');
  }

  pages.forEach((page, pageIndex) => {
    const nestedHorizon = page.querySelector('[fs-horizon]');
    if (nestedHorizon && nestedHorizon !== page) {
      throw new Error('[FullScroll] fs-horizon 중첩은 지원하지 않습니다.');
    }

    let anchor = page.getAttribute('fs-anchor')?.trim() || null;
    if (anchor) {
      if (anchorMap.has(anchor)) {
        warn(`중복된 fs-anchor="${anchor}"가 있습니다. 첫 번째 앵커만 사용합니다.`);
        anchor = null;
      } else {
        anchorMap.set(anchor, pageIndex);
      }
    }

    const slides = page.hasAttribute('fs-horizon') ? getDirectElements(page) : [];
    const isHorizon = slides.length >= 2;

    if (page.hasAttribute('fs-flow') && isHorizon) {
      warn(
        'fs-flow는 fs-horizon의 직계 슬라이드에 붙여야 합니다. 가로 그룹 자체에는 적용되지 않습니다.',
      );
    }

    if (page.hasAttribute('fs-horizon') && !isHorizon) {
      warn(`가로 그룹 ${pageIndex + 1}에 슬라이드가 2개 이상 필요합니다.`);
    }

    if (!isHorizon) {
      const flow = readFlowSettings(page, warn, { allowRelations: false });
      routes.push({
        index: routes.length,
        page,
        pageIndex,
        slide: null,
        slideIndex: null,
        anchor,
        ...flow,
      });
      return;
    }

    horizons.set(pageIndex, {
      page,
      pageIndex,
      slides,
      wrapper: null,
      swiper: null,
      nav: null,
    });

    slides.forEach((slide, slideIndex) => {
      const flow = readFlowSettings(slide, warn);
      routes.push({
        index: routes.length,
        page,
        pageIndex,
        slide,
        slideIndex,
        anchor,
        ...flow,
      });
    });
  });

  return { pages, routes, anchorMap, horizons };
}

export function routeIndexFromHash(hash, anchorMap, routes) {
  const rawHash = hash.replace(/^#/, '');
  if (!rawHash) return null;

  let decoded;
  try {
    decoded = decodeURIComponent(rawHash);
  } catch {
    return null;
  }

  const [anchor, rawSlide] = decoded.split('/');
  const pageIndex = anchorMap.get(anchor);
  if (pageIndex === undefined) return null;

  const candidates = routes.filter((route) => route.pageIndex === pageIndex);
  const humanSlide = Number.parseInt(rawSlide, 10);
  const slideIndex = Number.isFinite(humanSlide)
    ? clamp(humanSlide - 1, 0, candidates.length - 1)
    : 0;
  return candidates[slideIndex].index;
}

export function hashForRoute(route) {
  if (!route?.anchor) return null;
  const suffix = route.slideIndex === null ? '' : `/${route.slideIndex + 1}`;
  return `#${encodeURIComponent(route.anchor)}${suffix}`;
}

export function toPublicRoute(route) {
  if (!route) return null;
  return Object.freeze({
    index: route.index,
    pageIndex: route.pageIndex,
    slideIndex: route.slideIndex,
    anchor: route.anchor,
    page: route.page,
    slide: route.slide,
    flow: route.flow,
    flowEnterWith: route.flowEnterWith,
    flowExitWith: route.flowExitWith,
  });
}
