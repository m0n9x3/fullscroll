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

export function resolveFlowView({ horizon, origin, destination, currentIndex, nextIndex }) {
  if (
    !horizon?.swiper ||
    origin.pageIndex !== destination.pageIndex ||
    origin.slideIndex === null ||
    destination.slideIndex === null ||
    Math.abs(nextIndex - currentIndex) !== 1
  ) {
    return null;
  }

  const movingForward = nextIndex > currentIndex;
  const destinationRelation = destination.flow ? destination.flowEnterWith : null;
  const originRelation = origin.flow ? origin.flowExitWith : null;
  const destinationCompanionIndex = destinationRelation
    ? destination.slideIndex + (destinationRelation === 'prev' ? -1 : 1)
    : null;
  const originCompanionIndex = originRelation
    ? origin.slideIndex + (originRelation === 'prev' ? -1 : 1)
    : null;
  const canUseDestinationRelation =
    destinationRelation &&
    (movingForward || destinationCompanionIndex === origin.slideIndex);
  const canUseOriginRelation = originRelation && originCompanionIndex === destination.slideIndex;
  const relation = canUseDestinationRelation
    ? destinationRelation
    : canUseOriginRelation
      ? originRelation
      : null;
  if (!relation) return null;

  const flowRoute = canUseDestinationRelation ? destination : origin;
  const metrics = readSlideMetrics(horizon, flowRoute.slideIndex);
  const companionIndex = flowRoute.slideIndex + (relation === 'prev' ? -1 : 1);
  const companion = horizon.slides[companionIndex] ?? null;
  const viewportSize = horizon.page.clientWidth || horizon.swiper.width || 0;
  if (!metrics || !viewportSize || !metrics.size || !companion) return null;

  const rawOffset =
    relation === 'prev'
      ? metrics.start + metrics.size - viewportSize
      : metrics.start;
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
