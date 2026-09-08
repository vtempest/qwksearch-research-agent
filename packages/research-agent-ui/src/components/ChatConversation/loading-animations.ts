/**
 * @fileoverview Registry and random picker for the chat's "thinking" loader.
 *
 * The animated SVG spinners ship with `grab-url/animations` (the
 * `loading-animations` package of the GRAB-URL monorepo) and the quantum
 * orbital sphere ships with `quantum-sphere-loading-icon`. Both are pulled
 * into one pool so the chat can show a different loader on every response.
 */
import * as grabUrlAnimations from 'grab-url/animations';

/** Options accepted by every `grab-url/animations` spinner factory. */
export interface LoadingAnimationOptions {
  /** Hex colors substituted into the SVG, in order of appearance. */
  colors?: string[];
  /** Width of the SVG. */
  width?: number;
  /** Height of the SVG. */
  height?: number;
  /** Shorthand setting both width and height. */
  size?: number;
  /** Return the raw `<svg>` string instead of an `<img>` data-URI tag. */
  raw?: boolean;
}

/** A `grab-url/animations` factory: options in, SVG markup out. */
export type SvgLoadingAnimation = (options?: LoadingAnimationOptions) => string;

/**
 * Name of the quantum orbital sphere, which is rendered by a React component
 * rather than an SVG string and so is kept out of {@link SVG_LOADING_ANIMATIONS}.
 */
export const QUANTUM_SPHERE_ANIMATION = 'quantumSphere';

/**
 * Every animated SVG spinner exported by `grab-url/animations`, keyed by its
 * export name. Read off the module namespace rather than listed by hand, so
 * spinners added in a later `grab-url` release join the rotation on upgrade.
 */
export const SVG_LOADING_ANIMATIONS: Record<string, SvgLoadingAnimation> =
  Object.fromEntries(
    Object.entries(grabUrlAnimations as Record<string, unknown>).filter(
      ([name, factory]) =>
        typeof factory === 'function' && name.startsWith('loading'),
    ),
  ) as Record<string, SvgLoadingAnimation>;

/** Every loader the chat can show, sorted so the order is deterministic. */
export const LOADING_ANIMATION_NAMES: string[] = [
  QUANTUM_SPHERE_ANIMATION,
  ...Object.keys(SVG_LOADING_ANIMATIONS).sort(),
];

/** The previous pick, skipped next time so the loader visibly changes. */
let lastPicked: string | undefined;

/**
 * Picks one loader at random, never the same one twice in a row.
 *
 * @returns {string} A name from {@link LOADING_ANIMATION_NAMES}
 */
export function getRandomLoadingAnimation(): string {
  const choices = LOADING_ANIMATION_NAMES.filter((name) => name !== lastPicked);
  const pool = choices.length > 0 ? choices : LOADING_ANIMATION_NAMES;
  lastPicked = pool[Math.floor(Math.random() * pool.length)];
  return lastPicked;
}

/**
 * Renders one spinner to a raw `<svg>` string.
 *
 * @param name - A name from {@link SVG_LOADING_ANIMATIONS}
 * @param size - Width and height in pixels
 * @returns {string} SVG markup, or an empty string for an unknown name
 */
export function renderLoadingAnimation(name: string, size: number): string {
  const factory = SVG_LOADING_ANIMATIONS[name];
  return factory ? factory({ size, raw: true }) : '';
}
