/**
 * @fileoverview Unit tests for the chat loader pool: the spinner registry read
 * off `grab-url/animations`, the random picker, and SVG rendering.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    LOADING_ANIMATION_NAMES,
    QUANTUM_SPHERE_ANIMATION,
    SVG_LOADING_ANIMATIONS,
    getRandomLoadingAnimation,
    renderLoadingAnimation,
} from '../src/components/ChatConversation/loading-animations';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('SVG_LOADING_ANIMATIONS', () => {
    it('collects the spinner factories exported by grab-url/animations', () => {
        const names = Object.keys(SVG_LOADING_ANIMATIONS);

        expect(names.length).toBeGreaterThan(1);
        expect(names.every((name) => name.startsWith('loading'))).toBe(true);
        expect(
            Object.values(SVG_LOADING_ANIMATIONS).every(
                (factory) => typeof factory === 'function',
            ),
        ).toBe(true);
    });
});

describe('LOADING_ANIMATION_NAMES', () => {
    it('includes the quantum sphere alongside every SVG spinner', () => {
        expect(LOADING_ANIMATION_NAMES).toContain(QUANTUM_SPHERE_ANIMATION);
        expect(LOADING_ANIMATION_NAMES).toHaveLength(
            Object.keys(SVG_LOADING_ANIMATIONS).length + 1,
        );
    });

    it('has no duplicates', () => {
        expect(new Set(LOADING_ANIMATION_NAMES).size).toBe(
            LOADING_ANIMATION_NAMES.length,
        );
    });
});

describe('getRandomLoadingAnimation', () => {
    it('always returns a name from the pool', () => {
        for (let i = 0; i < 50; i++) {
            expect(LOADING_ANIMATION_NAMES).toContain(getRandomLoadingAnimation());
        }
    });

    it('stays in range when the RNG bottoms out', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);

        expect(LOADING_ANIMATION_NAMES).toContain(getRandomLoadingAnimation());
    });

    it('stays in range when the RNG tops out', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999999);

        expect(LOADING_ANIMATION_NAMES).toContain(getRandomLoadingAnimation());
    });

    it('never repeats the previous pick', () => {
        let previous = getRandomLoadingAnimation();

        for (let i = 0; i < 50; i++) {
            const next = getRandomLoadingAnimation();
            expect(next).not.toBe(previous);
            previous = next;
        }
    });

    it('eventually returns more than two distinct animations', () => {
        const seen = new Set(
            Array.from({ length: 200 }, () => getRandomLoadingAnimation()),
        );

        expect(seen.size).toBeGreaterThan(2);
    });
});

describe('renderLoadingAnimation', () => {
    it('renders a sized, animated svg for a known spinner', () => {
        const name = Object.keys(SVG_LOADING_ANIMATIONS)[0];

        const svg = renderLoadingAnimation(name, 64);

        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).toContain('width="64px"');
        expect(svg).toContain('height="64px"');
    });

    it('returns an empty string for an unknown name', () => {
        expect(renderLoadingAnimation('nope', 64)).toBe('');
        expect(renderLoadingAnimation(QUANTUM_SPHERE_ANIMATION, 64)).toBe('');
    });
});
