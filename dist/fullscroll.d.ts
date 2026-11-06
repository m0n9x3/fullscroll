import type Swiper from 'swiper';
import type { SwiperOptions } from 'swiper/types';

export interface FullScrollRoute {
  readonly index: number;
  readonly pageIndex: number;
  readonly slideIndex: number | null;
  readonly anchor: string | null;
  readonly page: HTMLElement;
  readonly slide: HTMLElement | null;
  readonly flow: boolean;
  readonly flowFooter: boolean;
  readonly flowEnterSide: 'prev' | 'next' | null;
  readonly flowExitSide: 'prev' | 'next' | null;
  readonly horizonOnly: boolean;
  readonly horizonFirst: boolean;
  readonly stepMax: number;
  readonly stepReentry: 'preserve' | 'first' | 'last' | null;
}

export interface FullScrollState {
  readonly version: string;
  readonly active: boolean;
  readonly responsive: boolean;
  readonly moving: boolean;
  readonly currentIndex: number;
  readonly total: number;
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly current: FullScrollRoute | null;
  readonly routes: readonly FullScrollRoute[];
}

export interface FullScrollLabels {
  navigation?: string;
  page?: string;
  horizonNavigation?: string;
  horizonPage?: string;
}

export interface FullScrollOptions {
  speed?: number;
  easing?: string;
  breakpoint?: number;
  wheelThreshold?: number;
  wheelIdle?: number;
  touchThreshold?: number;
  dots?: boolean;
  history?: boolean;
  effect?: 'slide' | 'fade' | 'blur' | 'creative' | 'depth' | 'layers' | 'zoom';
  stepReentry?: 'preserve' | 'first' | 'last';
  themeTarget?: string;
  labels?: FullScrollLabels;
  Swiper?: typeof Swiper;
  verticalSwiper?: SwiperOptions;
  horizontalSwiper?: SwiperOptions;
}

export interface FullScrollMoveOptions {
  trigger?: string;
  updateHistory?: boolean;
  instant?: boolean;
}

export default class FullScroll {
  static readonly version: string;
  static get(target: string | HTMLElement): FullScroll | null;

  constructor(target: string | HTMLElement, options?: FullScrollOptions);

  readonly root: HTMLElement;
  readonly state: FullScrollState;

  next(options?: FullScrollMoveOptions): Promise<boolean>;
  prev(options?: FullScrollMoveOptions): Promise<boolean>;
  moveTo(
    target: string | number,
    slideIndex?: number,
    options?: FullScrollMoveOptions,
  ): Promise<boolean>;
  enable(): void;
  disable(): void;
  refresh(): void;
  destroy(): void;
}

export { FullScroll };
