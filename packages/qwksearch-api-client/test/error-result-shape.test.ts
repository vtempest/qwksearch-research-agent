/**
 * @fileoverview Pins the shape the generated client resolves to on a non-2xx
 * response.
 *
 * Callers need the HTTP status to tell "your session expired" (401) apart from
 * "the server broke" (500). The client puts the *parsed body* in `error` and
 * never copies the status onto it, so the status has to come from `response`.
 * Reading `error.status` silently yields `undefined` and every branch on it is
 * dead code — which is how a stale-session fallback in research-agent-ui came
 * to never run.
 */
import { describe, expect, it, vi } from 'vitest';
import { createClient } from '../src/client/client.gen';

function respondWith(body: string, init: ResponseInit & { type?: string }) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(body, {
      ...init,
      headers: { 'Content-Type': init.type ?? 'application/json' },
    }),
  );
  return createClient({ baseUrl: 'https://example.test', fetch: fetchMock as never });
}

describe('generated client error result', () => {
  it('exposes the status on response, not on error', async () => {
    const client = respondWith(JSON.stringify({ message: 'Authentication required' }), {
      status: 401,
    });

    const result = await client.get({ url: '/agent/chats' });

    expect(result.response.status).toBe(401);
    expect((result.error as Record<string, unknown>).status).toBeUndefined();
  });

  it('puts the handler JSON body in error', async () => {
    const client = respondWith(JSON.stringify({ message: 'An error has occurred.' }), {
      status: 500,
    });

    const result = await client.get({ url: '/agent/chats' });

    expect(result.error).toEqual({ message: 'An error has occurred.' });
  });

  it('puts a non-JSON body in error as a raw string', async () => {
    // A 500 raised outside the route handler never carries this app's
    // `{ message }` shape, so `error.message` is undefined.
    const client = respondWith('<!DOCTYPE html><title>Error 1101</title>', {
      status: 500,
      type: 'text/html',
    });

    const result = await client.get({ url: '/agent/chats' });

    expect(typeof result.error).toBe('string');
    expect((result.error as unknown as { message?: string }).message).toBeUndefined();
  });
});
