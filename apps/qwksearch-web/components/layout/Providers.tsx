'use client';

import { QwkSearchProviders } from 'research-agent-ui';
import { authClient } from '@/lib/auth/client';
import { SettingsModalProvider } from '@/components/Settings/SettingsModal';
import { config, listFooterLinks } from '@/lib/config/site';

/**
 * The app's root providers. The stack itself — theming, session, chat,
 * dock, cookie banner, the research/docs view switch — lives in
 * `research-agent-ui` so the desktop app, the extension, and any external
 * consumer mount the same shell. This file supplies only what is specific
 * to the web app: its auth client, its site config, and its settings modal.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QwkSearchProviders
      authClient={authClient}
      ChromeProvider={SettingsModalProvider}
      config={{
        appName: config.appName,
        defaultSummarizePrompt: config.defaultSummarizePrompt,
        maxArticleLength: config.maxArticleLength,
        downloadChromeUrl: config.downloadChromeUrl,
        downloadWindowsStoreId: config.downloadWindowsStoreId,
        footerLinks: listFooterLinks,
        googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
        // Cloud project number the Drive picker identifies this app by. It is
        // the numeric prefix of the OAuth client ID, so it needs no separate
        // secret.
        googleAppId:
          process.env.NEXT_PUBLIC_GOOGLE_APP_ID ||
          config.googleClientId.split('-')[0],
        getAutoMediaSearch: () => true,
      }}
    >
      {children}
    </QwkSearchProviders>
  );
}
