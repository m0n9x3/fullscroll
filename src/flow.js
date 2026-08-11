import { clamp } from './dom.js';

function readSlideMetrics(horizon, slideIndex) {
  const slide = horizon?.slides?.[slideIndex] ?? null;
  const swiper = horizon?.swiper;
  if (!slide || !swiper) return null;

  const gridStart = Number(swiper.slidesGrid?.[slideIndex]);
  const gridSize = Number(swiper.slidesSizesGrid?.[slideIndex]);
  const start = Number.isFinite(gridStart) ? gridStart : slide.offsetLeft;
  const size = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : slide.offsetWidth;

  return { slide, start, size };
}

function resolveRelation(horizon, destination) {
  if (destination.flow && destination.flowEnterSide) {
    return { flowRoute: destination, relation: destination.flowEnterSide };
  }

  const previousRoute = horizon.routes[destination.slideIndex - 1] ?? null;
  if (previousRoute?.flowExitSide === 'next') {
    return { flowRoute: previousRoute, relation: 'next' };
  }

  const nextRoute = horizon.routes[destination.slideIndex + 1] ?? null;
  if (nextRoute?.flowExitSide === 'prev') {
    return { flowRoute: nextRoute, relation: 'prev' };
  }

  return null;
}

/** A Flow viewport is fixed to its destination route, not its travel direction. */
export function resolveFlowView({ horizon, destination }) {
  if (!horizon?.swiper || destination.slideIndex === null) return null;

  const relationView = resolveRelation(horizon, destination);
  if (!relationView) return null;

  const { flowRoute, relation } = relationView;
  const metrics = readSlideMetrics(horizon, flowRoute.slideIndex);
  const companionIndex = flowRoute.slideIndex + (relation === 'prev' ? -1 : 1);
  const companion = horizon.slides[companionIndex] ?? null;
  const viewportSize = horizon.page.clientWidth || horizon.swiper.width || 0;
  if (!metrics || !viewportSize || !metrics.size || !companion) return null;

  const rawOffset = relation === 'prev' ? metrics.start + metrics.size - viewportSize : metrics.start;
  const maxTranslate = Number(horizon.swiper.maxTranslate?.());
  const lastMetrics = readSlideMetrics(horizon, horizon.slides.length - 1);
  const maximum = Number.isFinite(maxTranslate)
    ? Math.max(0, -maxTranslate)
    : lastMetrics
      ? Math.max(0, lastMetrics.start + lastMetrics.size - viewportSize)
      : 0;

  return {
    offset: clamp(rawOffset, 0, maximum),
    pageIndex: horizon.pageIndex,
    flowSlide: metrics.slide,
    companion,
  };
}
