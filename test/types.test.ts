import Swiper from 'swiper';
import FullScroll, {
  type FullScrollMoveOptions,
  type FullScrollOptions,
  type FullScrollRoute,
  type FullScrollState,
} from '@fullscroll/core';

const options: FullScrollOptions = {
  Swiper,
  breakpoint: 720,
  dots: true,
  history: true,
  effect: 'depth',
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
const existing: FullScroll | null = FullScroll.get('[fs]');
const version: string = FullScroll.version;

void route;
void existing;
void version;
