'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/components/ResearchAgent/hooks/useSession';
import { NEXT_PUBLIC_GOOGLE_CLIENT_ID } from '@/lib/config/site';

export default function GoogleOneTap() {
  const { isAuthenticated, isLoading } = useSession();
  const startedRef = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || startedRef.current) return;
    if (!NEXT_PUBLIC_GOOGLE_CLIENT_ID) return;
    startedRef.current = true;

    const initOneTap = () => {
      const g = window.google;
      if (!g?.accounts?.id) return;

      g.accounts.id.initialize({
        client_id: NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        // FedCM-only mode: disables the legacy /gsi/status XHR that is
        // CORS-blocked when credentials mode is 'include'.
        use_fedcm_for_prompt: true,
        itp_support: true,
        callback: async (response: { credential: string }) => {
          try {
            const res = await fetch('/api/auth/one-tap/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: response.credential }),
              credentials: 'include',
            });
            if (res.ok) {
              window.location.href = '/';
            }
          } catch {
            // Silent fail — user can sign in via the buttons on /login.
          }
        },
      });

      g.accounts.id.prompt((notification: any) => {
        if (process.env.NODE_ENV === 'development') {
          if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
            console.warn(
              'Google One Tap not displayed:',
              notification.getNotDisplayedReason?.() ?? notification.getSkippedReason?.(),
            );
          }
        }
      });
    };

    // Reuse an already-loaded GSI script if present, otherwise inject it.
    if (window.google?.accounts?.id) {
      initOneTap();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src*="accounts.google.com/gsi"]',
      );
      if (existing) {
        existing.addEventListener('load', initOneTap);
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initOneTap;
        document.head.appendChild(script);
      }
    }
  }, [isLoading, isAuthenticated]);

  return null;
}
