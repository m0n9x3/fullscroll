import { clamp, getDirectHorizonChildren, getDirectPages } from './dom.js';
import { EFFECT_NAMES, isEffectName } from './effects.js';

const FLOW_RELATIONS = new Set(['prev', 'next']);
const STEP_REENTRIES = new Set(['preserve', 'first', 'last']);

function readEffect(element, warn) {
  const effect = element.getAttribute('fs-effect')?.trim().toLowerCase() || null;
  if (!effect) return null;
  if (isEffectName(effect)) return effect;

  warn(`[fs-effect]는 ${EFFECT_NAMES.join(', ')} 중 하나여야 합니다.`);
  return null;
}

function readFlowSettings(element, warn, { allowRelations = true, allowFooter = false } = {}) {
  const flow = element.hasAttribute('fs-flow');
  const settings = {
    flow,
    flowFooter: false,
    flowEnterSide: null,
    flowExitSide: null,
  };

  const rawValue = element.getAttribute('fs-flow')?.trim().toLowerCase() || '';
  if (!rawValue) return settings;

  if (rawValue === 'footer') {
    if (allowFooter) {
      settings.flowFooter = true;
    } else {
      settings.flow = false;
      warn('fs-flow="footer"는 [fs]의 마지막 세로 페이지에만 사용할 수 있습니다.');
    }
    return settings;
  }

  if (!allowRelations) {
    warn('fs-flow의 방향값은 fs-horizon의 직계 fs-flow 슬라이드에서만 사용할 수 있습니다.');
    return settings;
  }

  const sides = rawValue.split(',').map((value) => value.trim());
  if (sides.length > 2 || sides.some((value) => value && !FLOW_RELATIONS.has(value))) {
    warn('fs-flow에는 prev, next 또는 prev,next 형식만 사용할 수 있습니다.');
    return settings;
  }

  settings.flowEnterSide = sides[0] || null;
  settings.flowExitSide = sides[1] || null;

  return settings;
}

function readStepSettings(element, warn) {
  const rawSteps = element.getAttribute('fs-step');
  const rawReentry = element.getAttribute('fs-step-reentry')?.trim().toLowerCase() || null;
  const settings = { stepMax: 0, stepReentry: null };

  if (rawSteps !== null) {
    const stepMax = Number.parseInt(rawSteps, 10);
    if (!Number.isInteger(stepMax) || stepMax < 2 || String(stepMax) !== rawSteps.trim()) {
      warn('fs-step은 2 이상의 정수여야 합니다.');
    } else {
      settings.stepMax = stepMax;
    }
  }

  if (rawReentry) {
    if (!STEP_REENTRIES.has(rawReentry)) {
      warn('fs-step-reentry는 preserve, first, last 중 하나여야 합니다.');
    } else {
      settings.stepReentry = rawReentry;
    }
  }

  return settings;
}

function createRoute({ routes, page, pageIndex, pageCount, slide = null, slideIndex = null, anchor, horizon, warn }) {
  const flow = readFlowSettings(slide ?? page, warn, {
    allowRelations: slide !== null,
    allowFooter: slide === null && pageIndex === pageCount - 1,
  });
  const step = readStepSettings(slide ?? page, warn);

  return {
    index: routes.length,
    page,
    pageIndex,
    slide,
    slideIndex,
    anchor,
    horizonOnly: horizon?.only ?? false,
    horizonFirst: horizon?.first ?? false,
    stepElement: step.stepMax ? (slide ?? page) : null,
    ...step,
    mediaElement: (slide ?? page).hasAttribute('fs-video') ? (slide ?? page) : null,
    ...flow,
  };
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

    const { slides, overlays } = page.hasAttribute('fs-horizon')
      ? getDirectHorizonChildren(page)
      : { slides: [], overlays: [] };
    const isHorizon = slides.length >= 2;

    if (page.hasAttribute('fs-flow') && isHorizon) {
      warn(
        'fs-flow는 fs-horizon의 직계 슬라이드에 붙여야 합니다. 가로 그룹 자체에는 적용되지 않습니다.',
      );
    }

    if (page.hasAttribute('fs-step') && isHorizon) {
      warn('fs-step은 fs-horizon의 직계 슬라이드에 붙여야 합니다. 가로 그룹 자체에는 적용되지 않습니다.');
    }

    if (page.hasAttribute('fs-horizon') && !isHorizon) {
      warn(`가로 그룹 ${pageIndex + 1}에 슬라이드가 2개 이상 필요합니다.`);
    }

    if (!isHorizon) {
      routes.push(createRoute({ routes, page, pageIndex, pageCount: pages.length, anchor, warn }));
      return;
    }

    const horizon = {
      page,
      pageIndex,
      slides,
      overlays,
      wrapper: null,
      swiper: null,
      nav: null,
      routes: [],
      effect: readEffect(page, warn),
      only: page.hasAttribute('fs-horizon-only'),
      first: page.hasAttribute('fs-horizon-first'),
    };
    horizons.set(pageIndex, horizon);

    slides.forEach((slide, slideIndex) => {
      const route = createRoute({ routes, page, pageIndex, pageCount: pages.length, slide, slideIndex, anchor, horizon, warn });
      routes.push(route);
      horizon.routes.push(route);
    });
  });

  return { pages, routes, anchorMap, horizons };
}

export function routeIndexFromHash(hash, anchorMap, routes) {
  const rawHash = hash.replace(/^#/, '');
  if (!rawHash) return null;

  const separator = rawHash.indexOf('/');
  const rawAnchor = separator === -1 ? rawHash : rawHash.slice(0, separator);
  const rawSlide = separator === -1 ? '' : rawHash.slice(separator + 1);
  if (rawSlide.includes('/')) return null;

  let anchor;
  try {
    anchor = decodeURIComponent(rawAnchor);
  } catch {
    return null;
  }

  const pageIndex = anchorMap.get(anchor);
  if (pageIndex === undefined) return null;

  const candidates = routes.filter((route) => route.pageIndex === pageIndex);
  if (separator !== -1 && !/^[1-9]\d*$/.test(rawSlide)) return null;

  const slideIndex = rawSlide
    ? clamp(Number(rawSlide) - 1, 0, candidates.length - 1)
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
    flowFooter: route.flowFooter,
    flowEnterSide: route.flowEnterSide,
    flowExitSide: route.flowExitSide,
    horizonOnly: route.horizonOnly,
    horizonFirst: route.horizonFirst,
    stepMax: route.stepMax,
    stepReentry: route.stepReentry,
  });
}
