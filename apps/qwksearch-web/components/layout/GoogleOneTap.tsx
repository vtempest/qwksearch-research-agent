'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/components/ResearchAgent/hooks/useSession';
import { authClient } from '@/lib/auth/client';

export default function GoogleOneTap() {
  const { isAuthenticated, isLoading } = useSession();
  const startedRef = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || startedRef.current) return;
    startedRef.current = true;

    authClient.oneTap({
      onPromptNotification: (notification) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Google One Tap prompt notification:', notification);
        }
      },
    });
  }, [isLoading, isAuthenticated]);

  return null;
}
