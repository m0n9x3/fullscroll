import type FullScroll from './fullscroll.js';

export type FullScrollGsapPrepare = 'gsap' | 'css';
export type FullScrollGsapInitialPhase = 'ready' | 'manual';
export type FullScrollGsapEnterPhase = 'transitionstart' | 'change';
export type FullScrollGsapLeavePhase = 'transitionstart' | 'change' | 'none';
export type FullScrollGsapReentry = 'always' | 'once' | 'preserve';

export interface FullScrollGsapAnimation {
  pause(position?: number): FullScrollGsapAnimation;
  play(position?: number): FullScrollGsapAnimation;
  restart(includeDelay?: boolean): FullScrollGsapAnimation;
  reverse(): FullScrollGsapAnimation;
  progress(value?: number): number | FullScrollGsapAnimation;
}

export interface FullScrollGsapContext {
  revert(): void;
}

export interface FullScrollGsapRuntime {
  context(callback: () => void, scope?: Element): FullScrollGsapContext;
  fromTo(
    targets: Element | Element[] | NodeListOf<Element>,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>,
  ): FullScrollGsapAnimation;
  to(
    targets: Element | Element[] | NodeListOf<Element>,
    toVars: Record<string, unknown>,
  ): FullScrollGsapAnimation;
}

export interface FullScrollGsapTiming {
  initial?: FullScrollGsapInitialPhase;
  enter?: FullScrollGsapEnterPhase;
  leave?: FullScrollGsapLeavePhase;
}

export interface FullScrollGsapAnimationConfig {
  selector: string;
  prepare?: FullScrollGsapPrepare;
  from?: Record<string, unknown>;
  to?: Record<string, unknown>;
  at?: FullScrollGsapTiming;
  reentry?: FullScrollGsapReentry;
}

export interface FullScrollGsapOptions {
  gsap: FullScrollGsapRuntime;
  animations: FullScrollGsapAnimationConfig[];
  respectReducedMotion?: boolean;
}

export interface FullScrollGsapController {
  readonly root: HTMLElement;
  playCurrent(): void;
  refresh(): void;
  destroy(): void;
}

export function createGsapScenes(
  target: FullScroll,
  options: FullScrollGsapOptions,
): FullScrollGsapController;
