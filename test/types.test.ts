import Swiper from 'swiper';
import { gsap } from 'gsap';
import FullScroll, {
  type FullScrollMoveOptions,
  type FullScrollOptions,
  type FullScrollRoute,
  type FullScrollState,
} from '@fullscroll/core';
import { createGsapScenes, type FullScrollGsapOptions } from '@fullscroll/core/gsap';

const options: FullScrollOptions = {
  Swiper,
  breakpoint: 720,
  dots: true,
  history: true,
  effect: 'blur',
  stepReentry: 'preserve',
  themeTarget: '#header, .quick',
  verticalSwiper: { speed: 500 },
  horizontalSwiper: { effect: 'slide' },
};

const instance = new FullScroll(document.querySelector('[fs]')!, options);
const moveOptions: FullScrollMoveOptions = { trigger: 'type-test', instant: true };

void instance.next(moveOptions);
void instance.prev();
void instance.moveTo('intro', 1, moveOptions);

const state: FullScrollState = instance.state;
const route: FullScrollRoute | null = state.current;
const routes: readonly FullScrollRoute[] = state.routes;
const existing: FullScroll | null = FullScroll.get('[fs]');
const version: string = FullScroll.version;
const gsapOptions: FullScrollGsapOptions = {
  gsap: {} as FullScrollGsapOptions['gsap'],
  animations: [{
    selector: '[data-gsap]',
    prepare: 'gsap',
    from: { autoAlpha: 0, y: 32 },
    to: { autoAlpha: 1, y: 0, duration: 0.7 },
    at: { initial: 'manual', enter: 'change', leave: 'transitionstart' },
    reentry: 'always',
  }],
};
const gsapScenes = createGsapScenes(instance, gsapOptions);
const actualGsapScenes = createGsapScenes(instance, {
  gsap,
  animations: [{ selector: '[data-gsap]', prepare: 'css' }],
});

gsapScenes.playCurrent();
actualGsapScenes.playCurrent();

void route;
void routes;
void existing;
void version;
void gsapScenes;
void actualGsapScenes;
