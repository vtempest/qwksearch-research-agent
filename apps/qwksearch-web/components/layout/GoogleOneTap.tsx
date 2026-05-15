'use client';

import { useEffect, useRef } from 'react';
import { authClient } from '@/lib/auth/client';
import { useSession } from '@/components/ResearchAgent/hooks/useSession';

export default function GoogleOneTap() {
  const { isAuthenticated, isLoading } = useSession();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || triggeredRef.current) return;
    triggeredRef.current = true;

    authClient.oneTap({
      callbackURL: '/',
      onPromptNotification: (notification) => {
        // Triggered when FedCM/One Tap can't be shown (origin not whitelisted,
        // user dismissed, no Google session, etc.). Silently no-op — the user
        // can still sign in via the standard buttons on /login.
        if (process.env.NODE_ENV === 'development') {
          console.warn('Google One Tap not displayed:', notification);
        }
      },
    }).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Google One Tap failed:', error);
      }
    });
  }, [isLoading, isAuthenticated]);

  return null;
}
