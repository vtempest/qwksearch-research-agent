import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import RandomLoadingAnimation from './RandomLoadingAnimation';
import {
  LOADING_ANIMATION_NAMES,
  QUANTUM_SPHERE_ANIMATION,
  renderLoadingAnimation,
} from './loading-animations';

/**
 * `RandomLoadingAnimation` is the chat's "thinking" loader. Each mount picks a
 * different animation from the GRAB-URL spinner set (`grab-url/animations`)
 * plus the quantum orbital sphere, so a new one appears on every response.
 */
const meta: Meta<typeof RandomLoadingAnimation> = {
  title: 'ChatConversation/RandomLoadingAnimation',
  component: RandomLoadingAnimation,
};

export default meta;
type Story = StoryObj<typeof RandomLoadingAnimation>;

/** One random pick — reload the story to draw another. */
export const Default: Story = {};

/** Four mounts side by side, each picking independently. */
export const Several: Story = {
  render: () => (
    <div className="flex flex-wrap">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="w-1/2">
          <RandomLoadingAnimation size={100} />
        </div>
      ))}
    </div>
  ),
};

/** Every SVG spinner in the pool, for reviewing the set as a whole. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {LOADING_ANIMATION_NAMES.filter(
        (name) => name !== QUANTUM_SPHERE_ANIMATION,
      ).map((name) => (
        <figure key={name} className="flex flex-col items-center gap-2 w-32">
          <div
            dangerouslySetInnerHTML={{
              __html: renderLoadingAnimation(name, 80),
            }}
          />
          <figcaption className="text-xs text-muted-foreground">
            {name}
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};
