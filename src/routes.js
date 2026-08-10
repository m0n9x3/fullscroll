import { clamp, getDirectElements, getDirectPages } from './dom.js';

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
      throw new Error('[FullScroll] fs-horizon 중첩은 1.0.0에서 지원하지 않습니다.');
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

    if (page.hasAttribute('fs-horizon') && !isHorizon) {
      warn(`가로 그룹 ${pageIndex + 1}에 슬라이드가 2개 이상 필요합니다.`);
    }

    if (!isHorizon) {
      routes.push({
        index: routes.length,
        page,
        pageIndex,
        slide: null,
        slideIndex: null,
        anchor,
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
      routes.push({
        index: routes.length,
        page,
        pageIndex,
        slide,
        slideIndex,
        anchor,
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
  });
}
