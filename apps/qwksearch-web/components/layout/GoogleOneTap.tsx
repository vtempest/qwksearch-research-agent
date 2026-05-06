'use client';

import { useEffect } from 'react';
import { authClient } from '@/lib/auth/client';
import { useSession } from '@/components/ResearchAgent/hooks/useSession';

export default function GoogleOneTap() {
  const { isAuthenticated, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      authClient.oneTap();
    }
  }, [isLoading, isAuthenticated]);

  return null;
}
